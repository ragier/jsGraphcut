/*Edge = {
    dst,
    next,
    weight
};
*/

/*Vtx = {
    Vtx *next; // initialized and used in maxFlow() only
    int parent;
    int first;
    int ts;
    int dist;
    TWeight weight;
    uchar t;
};
*/


class GCGraph {
    constructor() {

        this.flow = 0;

        this.vtcs = [];
        this.edges = []; //*2
    }


    addEdges(i, j, w, revW) {

        this.edges.push({
            dst: j,
            next: this.vtcs[i].first,
            weight: w
        });
        this.vtcs[i].first = this.edges.length - 1;

        this.edges.push({
            dst: i,
            next: this.vtcs[j].first,
            weight: revW
        });
        this.vtcs[j].first = this.edges.length - 1;
    }

    addVtx() {
        this.vtcs.push({
            next: undefined,
            parent: 0,
            first: 0,
            ts: 0,
            dist: 0,
            weight: 0,
            t: 0
        });

        return this.vtcs.length - 1;
    }

    addTermWeights(i, sourceW, sinkW) {
        var dw = this.vtcs[i].weight;
        if (dw > 0)
            sourceW += dw;
        else
            sinkW -= dw;

        this.flow += (sourceW < sinkW) ? sourceW : sinkW;
        this.vtcs[i].weight = sourceW - sinkW;
    }

    inSourceSegment(i) {
        return this.vtcs[i].t == 0;
    }




    maxFlow() {
        const TERMINAL = -1;
        const ORPHAN = -2;
        var curr_ts = 0;

        var v;

        var orphans = [];

        var stub = {
            next: undefined,
            parent: undefined,
            first: undefined,
            ts: undefined,
            dist: undefined,
            weight: undefined,
            t: undefined
        };

        stub.next = stub;

        var first = stub;
        var last = stub;
        var nilNode = stub;



        for (var i = 0; i < this.vtcs.length; i++) {
            v = this.vtcs[i];
            v.ts = 0;
            if (v.weight != 0) {
                last = last.next = v;
                v.dist = 1;
                v.parent = TERMINAL;
                v.t = v.weight < 0;
            }
            else {
                v.parent = 0;
            }
        }

        first = first.next;
        last.next = nilNode;
        nilNode.next = undefined;

        for (; ;) {

            var e0 = -1, ei = 0, ej = 0;
            var minWeight, weight;
            var vt;


            while (first != nilNode || first == undefined) {
                //console.log(first, nilNode);
                v = first;
                if (v.parent) {
                    vt = v.t;
                    if (v.first == undefined) console.error("heere");
                    for (ei = v.first; ei != 0; ei = this.edges[ei].next) {
                        if (this.edges[ei].next == undefined) debugger;
                        //console.log(ei, this.edges[ei]);

                        if (this.edges[ei ^ vt].weight == 0) continue;
                        var u = this.vtcs[this.edges[ei].dst];

                        if (!u.parent) {
                            u.t = vt;
                            u.parent = ei ^ 1;
                            u.ts = v.ts;
                            u.dist = v.dist + 1;
                            if (!u.next) {
                                u.next = nilNode;
                                last = last.next = u;
                            }
                            continue;
                        }

                        if (u.t != vt) {
                            e0 = ei ^ vt;
                            break;
                        }

                        if (u.dist > v.dist + 1 && u.ts <= v.ts) {
                            // reassign the parent
                            u.parent = ei ^ 1;
                            u.ts = v.ts;
                            u.dist = v.dist + 1;
                        }
                    }
                    if (e0 > 0)
                        break;
                }
                // exclude the vertex from the active list
                first = first.next;
                v.next = 0;
            }

            if (e0 <= 0) {
                console.log("break");
                break;
            }

            //console.log("here");
            // find the minimum edge weight along the path
            minWeight = this.edges[e0].weight;

            if (minWeight <= 0) console.error("err");


            // k = 1: source tree, k = 0: destination tree
            for (var k = 1; k >= 0; k--) {
                for (v = this.vtcs[this.edges[e0 ^ k].dst]; ; v = this.vtcs[this.edges[ei].dst]) {
                    //console.log(v);
                    if (v.parent === undefined) console.error("err");
                    if ((ei = v.parent) < 0)
                        break;
                    weight = this.edges[ei ^ k].weight;
                    minWeight = Math.min(minWeight, weight);
                    if (minWeight <= 0) console.error("err");
                }

                weight = Math.abs(v.weight);
                minWeight = Math.min(minWeight, weight);
                if (minWeight <= 0) console.error("err");
            }

            // modify weights of the edges along the path and collect orphans
            this.edges[e0].weight -= minWeight;
            this.edges[e0 ^ 1].weight += minWeight;
            console.log(this.flow);
            this.flow += minWeight;

            // k = 1: source tree, k = 0: destination tree
            for (var k = 1; k >= 0; k--) {
                for (v = this.vtcs[this.edges[e0 ^ k].dst]; ; v = this.vtcs[this.edges[ei].dst]) {
                    if ((ei = v.parent) < 0)
                        break;

                    this.edges[ei ^ (k ^ 1)].weight += minWeight;

                    if ((this.edges[ei ^ k].weight -= minWeight) == 0) {
                        orphans.push(v);
                        v.parent = ORPHAN;
                    }
                }

                v.weight = v.weight + minWeight * (1 - k * 2);
                if (v.weight == 0) {
                    orphans.push(v);
                    v.parent = ORPHAN;
                }
            }

            // restore the search trees by finding new parents for the orphans
            curr_ts++;
            while (orphans.length > 0) {
                var v2 = orphans.pop();

                var d, minDist = Number.MAX_VALUE;
                e0 = 0;
                vt = v2.t;

                for (ei = v2.first; ei != 0; ei = this.edges[ei].next) {
                    if (this.edges[ei ^ (vt ^ 1)].weight == 0)
                        continue;
                    u = this.vtcs[this.edges[ei].dst];
                    if (u.t != vt || u.parent == 0)
                        continue;
                    // compute the distance to the tree root
                    for (d = 0; ;) {
                        if (u.ts == curr_ts) {
                            d += u.dist;
                            break;
                        }
                        ej = u.parent;
                        d++;
                        if (ej < 0) {
                            if (ej == ORPHAN)
                                d = Number.MAX_VALUE - 1;
                            else {
                                u.ts = curr_ts;
                                u.dist = 1;
                            }
                            break;
                        }
                        u = this.vtcs[this.edges[ej].dst];
                    }

                    // update the distance
                    if (++d < Number.MAX_VALUE) {
                        if (d < minDist) {
                            minDist = d;
                            e0 = ei;
                        }
                        for (u = this.vtcs[this.edges[ei].dst]; u.ts != curr_ts; u = this.vtcs[this.edges[u.parent].dst]) {
                            u.ts = curr_ts;
                            u.dist = --d;
                        }
                    }
                }

                if ((v2.parent = e0) > 0) {
                    v2.ts = curr_ts;
                    v2.dist = minDist;
                    continue;
                }

                /* no parent is found */
                v2.ts = 0;
                for (ei = v2.first; ei != 0; ei = this.edges[ei].next) {
                    u = this.vtcs[this.edges[ei].dst];
                    ej = u.parent;
                    if (u.t != vt || !ej)
                        continue;
                    if (this.edges[ei ^ (vt ^ 1)].weight && !u.next) {
                        u.next = nilNode;
                        last = last.next = u;
                    }
                    if (ej > 0 && this.vtcs[this.edges[ej].dst] == v2) {
                        orphans.push(u);
                        u.parent = ORPHAN;
                    }
                }
            }
        }

        return this.flow;

    }
}