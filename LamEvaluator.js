function EStep (name, action) {
    this.name = name;
    this.action = action;
}

function Evaluator (term) {
    this.term = term;
    this.stack = [];
    this.counter = 0;
    this.workers = [];
    this.stackstop = 0;
};

Evaluator.prototype.root = function () {
    if (this.stack.length > 0) {
        return this.stack[0];
    }
    return this.term;
};

Evaluator.prototype.top = function () {
    if (this.stack.length > 0) {
        return this.stack[0];
    }
    return {};
};

Evaluator.prototype.forget = function () {
    this.term = this.root ();
    this.stack = [];
    this.stackstop = 0;
};

Evaluator.prototype.findNode = function (x, y) {
    if (this.term.containsPoint (x,y)) {
        this.findNodeR (x, y, 0);
        return true;
    }
};

Evaluator.prototype.findNodeR = function (x, y, d) {
    this.stackstop = d;
    d++;
    for (var i=0; i<this.term.nodes.length; i++) {
        if (this.term.nodes[i].containsPoint (x, y)) {
            this.term.evalState = i;
            this.stack.push (this.term);
            this.term = this.term.nodes[i];
            this.findNodeR (x, y, d);
            return;
        }
    }
};



Evaluator.prototype.primOp0 = function (opname) {
    switch (opname) {
        case 'get':      return (parseFloat (prompt ("enter a number")));
        case 'random':   return Math.random ();
    }
    return 0;
};

Evaluator.prototype.primOp1 = function (opname, n) {
    switch (opname) {
        case 'not':     return n ? 0 : 1;
        case 'log':     return Math.log (n);
        case 'sqrt':    return Math.sqrt (n);
        case 'floor':   return Math.floor (n);
        case 'ceil':    return Math.ceil (n);
        case 'round':   return Math.round (n);
        case 'put':     console.log (n);
                        return 0;
        case 'alert':   alert (n);
                        return 0;
    }
    return 0;
};


Evaluator.prototype.primOp2 = function (opname, n1, n2) {
    switch (opname) {
        case '+':   return (n1 + n2);
        case '-':   return (n1 - n2);
        case '*':   return (n1 * n2);
        case '/':   return (n1 / n2);
        case '%':   return (n1 % n2);
        case '^':   return (Math.pow (n1, n2));
        case '<':   return (n1 < n2 ? 1 : 0);
        case '<=':   return (n1 <= n2 ? 1 : 0);
        case '>':   return (n1 > n2 ? 1 : 0);
        case '>=':   return (n1 >= n2 ? 1 : 0);
        case '==':   return (n1 == n2 ? 1 : 0);
        case '<>':   return (n1 != n2 ? 1 : 0);
    }
    return 0;
};

Evaluator.prototype.push = function () {
    this.stack.push (this.term);
    this.term = this.term.nodes[this.term.evalState];
    this.term.evalState = 0;
};

Evaluator.prototype.pop = function () {
    if (this.stack.length > this.stackstop) {
        var r = this.term;
        var t = this.stack.pop ();
        t.nodes[t.evalState] = this.term;
        if (t.type == LamCons) {
            t.evalState = 2;
            this.term = t;
        }
        else if (t.type == LamThunk) {
            t.evalFlag = true;
            t.evalState++;
            this.term = t;
        }
        else {
            t.evalState++;
            this.term = t;
        }
        return true;
    }
    this.done = true;
    return false;
};

Evaluator.prototype.rebind = function () {
    if (this.stack.length > 0) {
        var t = this.stack[this.stack.length - 1];
        t.nodes[t.evalState] = this.term;
    }
};

Evaluator.prototype.evalOp0 = function () {
    this.term = new LamNum (this.primOp0 (this.term.opname));
    this.rebind ();
    return true;
};

Evaluator.prototype.evalOp1 = function () {
    this.term = new LamNum (this.primOp1 (this.term.opname, this.term.nodes[0].number));
    this.rebind ();
    return true;
};

Evaluator.prototype.evalOp2 = function () {
    this.term = new LamNum (this.primOp2 (this.term.opname, this.term.nodes[0].number, this.term.nodes[1].number));
    this.rebind ();
    return true;
};

Evaluator.prototype.evalApp = function () {
    var f = this.term.nodes[0];
    var a = this.term.nodes[1];
    var r;

    if (f.lazy) {
        if (a.type == LamBind || (a.type == LamThunk && a.closed)) {
            this.term = f.nodes[0].substitute (f.name, a);
        }
        else {
            r = new LamThunk (true);
            r.nodes[0] = a;
            this.term = f.nodes[0].substitute (f.name, r);
        }
    }
    else {
        var obj = {};
        a.freeVars (obj, []);
        var free = [];
        for (var key in obj) {
            free.push (key);
        }
        this.term = f.nodes[0].substituteCloneAlpha (f.name, a, free);
    }

    this.rebind ();
    return true;
};

Evaluator.prototype.evalRec = function () {
    var t = new LamThunk (true);
    t.nodes[0] = this.term.nodes[0].substitute (this.term.name, t);
    this.term = t;
    this.rebind ();
    return true;
};

Evaluator.prototype.evalBind0 = function () {
    var r = new LamBind (this.term.nodes[0], this.term.nodes[1]);
    r.evalFlag = this.term.evalFlag;
    this.term = r;
    this.rebind ();
    this.push ();
    return true;
};

Evaluator.prototype.evalBind1 = function () {
    if (this.term.evalFlag == false) {
        // evaluate body of unit
        if (this.term.nodes[0].type == LamUnit) {
            this.term.nodes[0] = this.term.nodes[0].nodes[0];
            this.term.evalFlag = true;
            this.term.evalState = 0;
            this.push ();
        }
        else {
            console.log ("WARN: first arg of LamBind must reduce to LamUnit");
            return false;
        }
    }
    else {
        // body of unit is evaluated, unit is removed
        this.term = new LamApp (this.term.nodes[1], this.term.nodes[0])
        this.rebind ();
    }
    return true;
};


Evaluator.prototype.evalIf = function () {
    if (this.term.nodes[0].number !== undefined && (this.term.nodes[0].number == 0)) {
        this.term = this.term.nodes[2];
    }
    else {
        this.term = this.term.nodes[1];
    }
    this.rebind ();
    return true;
};

Evaluator.prototype.evalCons = function () {
    if (this.top ().type == LamCar) {
        /*
        this.stack.pop ();
        this.term = this.term.nodes[0];
        this.rebind ();
        this.soundplayer.cons1 ();
        console.log ("YES");
        */

        this.push ();
    }
    else if (this.top ().type == LamCdr) {
        /*
        this.stack.pop ();
        this.term = this.term.nodes[1];
        this.rebind ();
        this.soundplayer.cons2 ();
        console.log ("YES");
        */
        this.term.evalState = 1;
        this.push ();

    }
    else {
        return this.pop ();
    }
};

Evaluator.prototype.evalIscons = function () {
    if (this.term.nodes[0].type == LamCons) {
        this.term = new LamNum (1);
    }
    else {
        this.term = new LamNum (0);
    }
    this.rebind ();
    return true;
};

Evaluator.prototype.evalCar = function () {
    this.term = this.term.nodes[0].nodes[0];
    this.rebind ();
    return true;
};

Evaluator.prototype.evalCdr = function () {
    this.term = this.term.nodes[0].nodes[1];
    this.rebind ();
    return true;
};

Evaluator.prototype.evalThunk = function () {
    this.term = this.term.nodes[0];
    this.rebind ();
    return true;
};

Evaluator.prototype.evalPar = function () {
    var worker = new Evaluator (this.term.nodes[0]);
    worker.workers = this.workers;
    this.workers.push (worker);
    this.term = this.term.nodes[1];
    this.rebind ();
    return true;
};

Evaluator.prototype.isIOContinuation = function () {
    if (this.stack.length == 0) {
        return true;
    }
    var t = this.stack[this.stack.length - 1];
    if (t.type == LamBind) {
        return true;
    }
    return false;

};

Evaluator.prototype.step = function () {
    var r = [this.stepE ()];
    for (var i=0; i<this.workers.length; i++) {
        if (this.workers[i].done) {
            this.workers.splice (i, 1);
            i--;
        }
        else {
            r.push (this.workers[i].stepE ());
        }
    }
    return r;
};

Evaluator.prototype.stepE = function () {
    //console.log (this.term);
    this.counter++;
    var evaluator = this;
    switch (this.term.type) {
        case LamVar:    // error, no free variables allowed
            return new EStep ('freevar', function () { return false });
        case LamAbs:
            return new EStep ('abs', function () {
                return evaluator.pop ();
            });
        case LamApp:
            if (this.term.evalState < 1) {
                return new EStep ('app0', function () {
                    evaluator.push ();
                    return true;
                });
            }
            else {
                return new EStep ('app1', function () {
                    return evaluator.evalApp ();
                });
            }
        case LamAps:
            if (this.term.evalState < 2) {
                return new EStep ('app0', function () {
                    evaluator.push ();
                    return true;
                });
            }
            else {
                return new EStep ('app1', function () {
                    evaluator.evalApp ();
                    return true;
                });
            }
        case LamRec:
            return new EStep ('rec', function () {
                return evaluator.evalRec ();
            });
        case LamNum:
            return new EStep ('num', function () {
                return evaluator.pop ();
            });
        case LamOp0:
            return new EStep ('op0', function () {
                evaluator.evalOp0 ();
                return true;
            });
        case LamOp1:
            if (this.term.evalState < 1) {
                return new EStep ('op1_0', function () {
                    evaluator.push ();
                    return true;
                });
            }
            else {
                return new EStep ('op1', function () {
                    return evaluator.evalOp1 ();
                });
            }
            return true;
        case LamOp2:
            if (this.term.evalState < 2) {
                return new EStep ('op2_0', function () {
                    evaluator.push ();
                    return true;
                });
            }
            else {
                return new EStep ('op2', function () {
                    evaluator.evalOp2 ();
                    return true;
                });
            }
        case LamIf:
            if (this.term.evalState < 1) {
                return new EStep ('if0', function () {
                    evaluator.push ();
                    return true;
                });
            }
            else {
                return new EStep ('if1', function () {
                    evaluator.evalIf ();
                    return true;
                });
            }
        case LamCons:
            if (this.term.evalState == 0) {
                return new EStep ('cons1', function () {
                    evaluator.evalCons ();
                    return true;
                });
            }
            else {
                return new EStep ('cons0', function () {
                    return evaluator.pop ();
                });
            }
        case LamCar:
            if (this.term.evalState < 1) {
                return new EStep ('car0', function () {
                    evaluator.push ();
                    return true;
                });
            }
            else {
                return new EStep ('car1', function () {
                    evaluator.evalCar ();
                    return true;
                });
            }
        case LamCdr:
            if (this.term.evalState < 1) {
                return new EStep ('cdr0', function () {
                    evaluator.push ();
                    return true;
                });
            }
            else {
                return new EStep ('cdr1', function () {
                    evaluator.evalCdr ();
                    return true;
                });
            }
        case LamIscons:
            if (this.term.evalState < 1) {
                return new EStep ('iscons0', function () {
                    evaluator.push ();
                    return true;
                });
            }
            else {
                return new EStep ('iscons1', function () {
                    evaluator.evalIscons ();
                    return true;
                });
            }
            return true;
        case LamUnit:
            return new EStep ('unit', function () {
                return evaluator.pop ();
            });
        case LamBind:
            if (this.isIOContinuation ()) {
                if (this.term.evalState == 0) {
                    return new EStep ('bind0', function () {
                        return evaluator.evalBind0 ();
                    });
                }
                else if (this.term.evalState == 1) {
                    return new EStep ('bind1', function () {
                        return evaluator.evalBind1 ();
                    });
                }
            }
            else {
                return new EStep ('bind', function () {
                    return evaluator.pop ();
                });
            }
        case LamThunk:
            //if (this.term.evalState < 1) {
            if (this.term.evalFlag == false) {
                if (this.term.open) {
                    return new EStep ('block', function () {
                        return true;
                    });
                }
                else {
                    this.term.open = true;  // set immediately
                    return new EStep ('thunk0', function () {
                        evaluator.push ();
                        return true;
                    });
                }
            }
            else {
                return new EStep ('thunk1', function () {
                    evaluator.evalThunk ();
                    return true;
                });
            }
        case LamPar:
            return new EStep ('par', function () {
                evaluator.evalPar ();
                return true;
            });


    }
    return false;
}


///////////////////////////////////////////////
Evaluator.prototype.stepOLD = function () {
    this.counter++;
    switch (this.term.type) {
        case LamVar:    // error, no free variables allowed
            return false;
        case LamAbs:
            this.soundplayer.abs ();
            return this.pop ();
        case LamApp:
            if (this.term.evalState < 1) {
                this.push ();
                this.soundplayer.app0 ();
                return true;
            }
            else {
                return this.evalApp ();
            }
        case LamAps:
            if (this.term.evalState < 2) {
                this.soundplayer.app0 ();
                this.push ();
            }
            else {
                this.evalApp ();
            }
            return true;
        case LamRec:
            return this.evalRec ();
        case LamNum:
            this.soundplayer.num ();
            return this.pop ();
        case LamOp0:
            this.evalOp0 ();
            return true;
        case LamOp1:
            if (this.term.evalState < 1) {
                this.soundplayer.op1_0 ();
                this.push ();
            }
            else {
                return this.evalOp1 ();
            }
            return true;
        case LamOp2:
            if (this.term.evalState < 2) {
                this.soundplayer.op2_0 ();
                this.push ();
            }
            else {
                this.evalOp2 ();
            }
            return true;
        case LamIf:
            if (this.term.evalState < 1) {
                this.soundplayer.if0 ();
                this.push ();
            }
            else {
                this.evalIf ();
            }
            return true;
        case LamCons:
            if (this.term.evalState == 0) {
                this.evalCons ();
            }
            else {
                this.soundplayer.cons0 ();
                return this.pop ();
            }
            return true;
        case LamCar:
            if (this.term.evalState < 1) {
                this.soundplayer.car0 ();
                this.push ();
            }
            else {
                this.evalCar ();
            }
            return true;
        case LamCdr:
            if (this.term.evalState < 1) {
                this.soundplayer.cdr0 ();
                this.push ();
            }
            else {
                this.evalCdr ();
            }
            return true;
        case LamIscons:
            if (this.term.evalState < 1) {
                this.soundplayer.iscons0 ();
                this.push ();
            }
            else {
                this.evalIscons ();
            }
            return true;
        case LamUnit:
           this.soundplayer.unit ();
           return this.pop ();
        case LamBind:
            if (this.term.evalState == 0) {
                return this.evalBind0 ();
            }
            else if (this.term.evalState == 1) {
                return this.evalBind1 ();
            }
        case LamThunk:
            if (this.term.evalState < 1) {
                this.soundplayer.thunk0 ();
                this.push ();
            }
            else {
                this.evalThunk ();
            }
            return true;
    }
    return false;
}





/*



function Reductions () {
}

Reductions.onVar = function (evaluator) {
    return false;
};
Reductions.onAbs = function (evaluator) {
    return evaluator.pop ();
};
Reductions.onApp = function (evaluator) {
    if (evaluator.term.evalState < 1) {
        evaluator.push ();
    }
    else {
        evaluator.evalApp ();
    }
    return true;
};
Reductions.onRec = function (evaluator) {
    var t = new LamThunk ();
    t.nodes[0] = evaluator.term.nodes[0].substitute (evaluator.term.name, t);
    evaluator.term = t;
    evaluator.rebind ();
    return true;
};
Reductions.onNum = function (evaluator) {
    return evaluator.pop ();
};
Reductions.onOp0 = function (evaluator) {
    return evaluator.evalOp0 ();
};
Reductions.onOp1 = function (evaluator) {
            if (evaluator.term.evalState < 1) {
                evaluator.push ();
            }
            else {
                evaluator.evalOp1 ();
            }
            return true;
};
Reductions.onOp2 = function (evaluator) {
            if (evaluator.term.evalState < 2) {
                evaluator.push ();
            }
            else {
                evaluator.evalOp2 ();
            }
            return true;
};
Reductions.onIf = function (evaluator) {
            if (evaluator.term.evalState < 1) {
                evaluator.push ();
            }
            else {
                if (evaluator.term.nodes[0].number !== undefined && (evaluator.term.nodes[0].number == 0)) {
                    evaluator.term = evaluator.term.nodes[2];
                }
                else {
                    evaluator.term = evaluator.term.nodes[1];
                }
                evaluator.rebind ();
            }
            return true;
};
Reductions.onCons = function (evaluator) {
            if (evaluator.term.evalState == 0) {
                if (evaluator.top ().type == LamCar) {
                    evaluator.push ();
                }
                else if (evaluator.top ().type == LamCdr) {
                    evaluator.term.evalState = 1;
                    evaluator.push ();
                }
                else {
                     return evaluator.pop ();
                }
            }
            else {
                 return evaluator.pop ();
            }
            return true;
};
Reductions.onCar = function (evaluator) {
            if (evaluator.term.evalState < 1) {
                evaluator.push ();
            }
            else {

                evaluator.term = evaluator.term.nodes[0].nodes[0];
                evaluator.rebind ();
            }
            return true;
};
Reductions.onCdr = function (evaluator) {
            if (evaluator.term.evalState < 1) {
                evaluator.push ();
            }
            else {
                evaluator.term = evaluator.term.nodes[0].nodes[1];
                evaluator.rebind ();
            }
            return true;
};
Reductions.onIscons = function (evaluator) {
            if (evaluator.term.evalState < 1) {
                evaluator.push ();
            }
            else {
                if (evaluator.term.nodes[0].type == LamCons) {
                    evaluator.term = new LamNum (1);
                }
                else {
                    evaluator.term = new LamNum (0);
                }
                evaluator.rebind ();
            }
            return true;
};
Reductions.onUnit = function (evaluator) {
            return evaluator.pop ();
};
Reductions.onBind = function (evaluator) {
            if (evaluator.term.evalState == 0) {
                evaluator.term = new LamBind (evaluator.term.nodes[0], evaluator.term.nodes[1]);
                evaluator.rebind ();
                evaluator.push ();
            }
            else if (evaluator.term.evalState == 1) {
                if (evaluator.term.evalFlag == false) {
                    // evaluate body of unit
                    if (evaluator.term.nodes[0].type == LamUnit) {
                        evaluator.term.nodes[0] = evaluator.term.nodes[0].nodes[0];
                        evaluator.term.evalFlag = true;
                        evaluator.term.evalState = 0;
                        evaluator.push ();
                    }
                    else {
                        console.log ("WARN: first arg of LamBind must reduce to LamUnit");
                        return false;
                    }
                }
                else {
                    // body of unit is evaluated, unit is removed
                    evaluator.term = new LamApp (evaluator.term.nodes[1], evaluator.term.nodes[0])
                    evaluator.rebind ();
                }
            }
            return true;
};
Reductions.onThunk = function (evaluator) {
            if (evaluator.term.evalState < 1) {
                evaluator.push ();
            }
            else {
                evaluator.term = evaluator.term.nodes[0];
                evaluator.rebind ();
            }
            return true;
};




Evaluator.prototype.step0 = function () {
    this.counter++;
    switch (this.term.type) {
        case LamVar:    // error, no free variables allowed
            return Reductions.onVar (this);
        case LamAbs:
            return Reductions.onAbs (this);
        case LamApp:
            return Reductions.onApp (this);
        case LamRec:
            return Reductions.onRec (this);
        case LamNum:
            return Reductions.onNum (this);
        case LamOp0:
            return Reductions.onOp0 (this);
        case LamOp1:
            return Reductions.onOp1 (this);
        case LamOp2:
            return Reductions.onOp2 (this);
        case LamIf:
            return Reductions.onIf (this);
        case LamCons:
            return Reductions.onCons (this);
        case LamCar:
            return Reductions.onCar (this);
        case LamCdr:
            return Reductions.onCdr (this);
        case LamIscons:
            return Reductions.onIscons (this);
        case LamUnit:
            return Reductions.onUnit (this);
        case LamBind:
            return Reductions.onBind (this);
        case LamThunk:
            return Reductions.onThunk (this);
    }
    return false;
}






Evaluator.prototype.stepOLD2 = function () {
   // console.log (this.term);
    this.counter++;
    switch (this.term.type) {
        case LamVar:    // error, no free variables allowed
            return false;
        case LamAbs:
            return this.pop ();
        case LamApp:
            if (this.term.evalState < 1) {
                this.push ();
            }
            else {
                var f = this.term.nodes[0];
                var a = this.term.nodes[1];
                var r;
                if ((a.type == LamBind) || (f.lazy==false)) {
                    r = a;
                }
                else {
                    r = new LamThunk (true);
                    r.nodes[0] = a;
                }
                this.term = f.nodes[0].substitute (f.name, r);
                this.rebind ();
            }
            return true;
        case LamRec:
            var t = new LamThunk ();
            t.nodes[0] = this.term.nodes[0].substitute (this.term.name, t);
            this.term = t;
            this.rebind ();
            return true;
        case LamNum:
            return this.pop ();
        case LamOp0:
            this.term = this.evalOp0 (this.term.opname);
            this.rebind ();
            return true;
        case LamOp1:
            if (this.term.evalState < 1) {
                this.push ();
            }
            else {
                this.term = this.evalOp1 (this.term.opname, this.term.nodes[0].number);
                this.rebind ();
            }
            return true;
        case LamOp2:
            if (this.term.evalState < 2) {
                this.push ();
            }
            else {
                this.term = this.evalOp2 (this.term.opname, this.term.nodes[0].number, this.term.nodes[1].number);
                this.rebind ();
            }
            return true;
        case LamIf:
            if (this.term.evalState < 1) {
                this.push ();
            }
            else {
                if (this.term.nodes[0].number !== undefined && (this.term.nodes[0].number == 0)) {
                    this.term = this.term.nodes[2];
                }
                else {
                    this.term = this.term.nodes[1];
                }
                this.rebind ();
            }
            return true;
        case LamCons:
            if (this.term.evalState == 0) {
                if (this.top ().type == LamCar) {
                    this.push ();
                }
                else if (this.top ().type == LamCdr) {
                    this.term.evalState = 1;
                    this.push ();
                }
                else {
                     return this.pop ();
                }
            }
            else {
                 return this.pop ();
            }
            return true;
        case LamCar:
            if (this.term.evalState < 1) {
                this.push ();
            }
            else {

                this.term = this.term.nodes[0].nodes[0];
                this.rebind ();
            }
            return true;
        case LamCdr:
            if (this.term.evalState < 1) {
                this.push ();
            }
            else {
                this.term = this.term.nodes[0].nodes[1];
                this.rebind ();
            }
            return true;
        case LamIscons:
            if (this.term.evalState < 1) {
                this.push ();
            }
            else {
                if (this.term.nodes[0].type == LamCons) {
                    this.term = new LamNum (1);
                }
                else {
                    this.term = new LamNum (0);
                }
                this.rebind ();
            }
            return true;
        case LamUnit:
            return this.pop ();
        case LamBind:
            if (this.term.evalState == 0) {
                this.term = new LamBind (this.term.nodes[0], this.term.nodes[1]);
                this.rebind ();
                this.push ();
            }
            else if (this.term.evalState == 1) {
                if (this.term.evalFlag == false) {
                    // evaluate body of unit
                    if (this.term.nodes[0].type == LamUnit) {
                        this.term.nodes[0] = this.term.nodes[0].nodes[0];
                        this.term.evalFlag = true;
                        this.term.evalState = 0;
                        this.push ();
                    }
                    else {
                        console.log ("WARN: first arg of LamBind must reduce to LamUnit");
                        return false;
                    }
                }
                else {
                    // body of unit is evaluated, unit is removed
                    this.term = new LamApp (this.term.nodes[1], this.term.nodes[0])
                    this.rebind ();
                }
            }
            return true;
        case LamThunk:
            if (this.term.evalState < 1) {
                this.push ();
            }
            else {
                this.term = this.term.nodes[0];
                this.rebind ();
            }
            return true;
    }
    return false;
}
*/