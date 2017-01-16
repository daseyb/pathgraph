/// <reference path="node_modules/@types/snapsvg/index.d.ts"/>
/// <reference path="node_modules/@types/knockout/index.d.ts"/>
/// <reference path="node_modules/@types/jquery/index.d.ts"/>

var COLOR_PRIMARY = ko.observable<Snap.RGB>(Snap.getRGB("#2C3E50"));
var COLOR_SUCCESS = ko.observable<Snap.RGB>(Snap.getRGB("#18BC9C"));
var COLOR_INFO = ko.observable<Snap.RGB>(Snap.getRGB("#3498DB"));
var COLOR_WARNING = ko.observable<Snap.RGB>(Snap.getRGB("#F39C12"));
var COLOR_DANGER = ko.observable<Snap.RGB>(Snap.getRGB("#E74C3C"));

var BACKGROUND_COLOR = ko.observable<Snap.RGB>(Snap.getRGB("rgb(200, 200, 200)"));
var CAM_BACKGROUND_COLOR = ko.observable<Snap.RGB>(Snap.getRGB("rgb(255, 255, 255)"));
var CAM_OUTLINE = COLOR_PRIMARY;// ko.observable<Snap.RGB>(Snap.getRGB("rgb(60, 60, 60)"));

class Vec2 {
    x: number;
    y: number;
    constructor(x: number, y: number) {
        this.x = x;
        this.y = y;
    }

    toString() {
        return `(${this.x}, ${this.y})`;
    }
}

function add(a: Vec2, b: Vec2) {
    return new Vec2(a.x + b.x, a.y + b.y);
}

function sub(a: Vec2, b: Vec2) {
    return new Vec2(a.x - b.x, a.y - b.y);
}


function mulV(a: Vec2, b: Vec2) {
    return new Vec2(a.x * b.x, a.y * b.y);
}

function mul(a: Vec2, b: number) {
    return new Vec2(a.x * b, a.y * b);
}

function dot(a: Vec2, b: Vec2) {
    return a.x * b.x + a.y * b.y;
}

function vlength(a: Vec2) {
    return Math.sqrt(dot(a, a));
}

function normalize(a: Vec2) {
    var len = vlength(a);
    return new Vec2(a.x / len, a.y / len);
}

function reflect(i: Vec2, n: Vec2) {
    i = mul(i, 1);
    return sub(i, mul(n, 2.0 * dot(n, i)));
}

function refract(i: Vec2, n: Vec2, eta: number) {
    var NdotI = dot(n, i);
    var k = 1.0 - eta * eta * (1.0 - NdotI * NdotI);
    if (k < 0.0)
        return new Vec2(0, 0);
    else
        return sub(mul(i, eta), mul(n, eta * NdotI + Math.sqrt(k) ));
}

function cross(a: Vec2, b: Vec2) {
    return a.x * b.y - a.y * b.x;
}

function perp(a: Vec2) {
    return new Vec2(-a.y, a.x);
}


function uniformSampleHemisphere(n: Vec2) {
    var Xi1 = Math.random();
    var Xi2 = Math.random();

    var theta = Xi1;
    var phi = 2.0 * Math.PI * Xi2;

    var f = Math.sqrt(1 - theta * theta);

    var x = f * Math.cos(phi);
    var y = theta;

    var dir = new Vec2(x, y);
    dir = mul(dir, sign(dot(dir, n)));
    return dir;
}

function cosineSampleHemisphere(n: Vec2) {
    var Xi1 = Math.random();
    var Xi2 = Math.random();

    var theta = Xi1;
    var phi = 2.0 * Math.PI * Xi2;

    var f = Math.sqrt(1 - theta);

    var x = f * Math.cos(phi);
    var y = Math.sqrt(theta);

    var xDir = perp(n);
    return add(mul(xDir, x),  mul(n,y));
}

function sampleCircle(pos: Vec2, rad: number) {
    var angle = Math.random() * 2 * Math.PI;
    var dir = new Vec2(Math.sin(angle), Math.cos(angle));

    return add(pos, mul(dir, rad));
}

class Ray {
    o: Vec2;
    d: Vec2;

    constructor(o: Vec2, d: Vec2) {
        this.o = o;
        this.d = d;
    }
}

function sign(f : number) {
    return f < 0 ? -1 : 1;
}

function intersectRayLinesegment(r:Ray, a:Vec2, b:Vec2, result:Intersection) {

    var v1 = sub(r.o, a);
    var v2 = sub(b, a);
    var v3 = perp(r.d);

    var t1 = cross(v2, v1) / dot(v2, v3);
    var t2 = dot(v1, v3) / dot(v2, v3);
    if (t1 < 0 || t2 < 0 || t2 > 1) return false;

    result.p = add(r.o, mul(r.d, t1));
    result.n = perp(v2);
    result.n = mul(result.n, -sign(dot(result.n, r.d)));

    return true;
}

class Intersection {
    p: Vec2;
    n: Vec2;
    shape: Shape;
}

function transformPoint(a: Vec2, mat: Snap.Matrix) {
    return new Vec2(mat.x(a.x, a.y), mat.y(a.x, a.y));
}

function transpose(mat: Snap.Matrix) {
    return Snap.matrix(mat.d, mat.c, mat.b, mat.a, 0, 0);
}

function transformDir(a: Vec2, mat: Snap.Matrix) {
    var dirTrans = transpose(mat.invert());
    return normalize(transformPoint(a, dirTrans));
}

function transformRay(ray: Ray, mat: Snap.Matrix) {
    return new Ray(transformPoint(ray.o, mat), transformDir(ray.d, mat));
}

class Material {
    outlineColor: KnockoutObservable<Snap.RGB>;
    fillColor: KnockoutObservable<Snap.RGB>;

    outlineOpacity: number;
    fillOpacity: number;

    outlineWidth: number;

    linkedElements: Thing[];

    constructor(outlineColor: KnockoutObservable<Snap.RGB>, fillColor: KnockoutObservable<Snap.RGB>, outlineOpacity: number, fillOpacity: number, outlineWidth: number) {
        this.outlineColor = outlineColor;
        this.fillColor = fillColor;
        this.outlineOpacity = outlineOpacity;
        this.fillOpacity = fillOpacity;
        this.outlineWidth = outlineWidth;
        this.linkedElements = [];

        this.outlineColor.subscribe((newValue) => { this.update() });
        this.fillColor.subscribe((newValue) => { this.update() });
    }

    update() {
        for (var el of this.linkedElements) {
            this.apply(el.svgElement());
        }
    }

    apply(el: Snap.Element) {
        el.attr({
            fill: this.fillOpacity > 0.01 ? this.fillColor().hex : "none",
            stroke: this.outlineColor().hex,
            strokeWidth: this.outlineWidth / (el.transform().localMatrix ? el.transform().localMatrix.split().scalex : 1),
            "fill-opacity": this.fillOpacity,
            "stroke-opacity": this.outlineOpacity,
            //"vector-effect": "non-scaling-stroke",
        });
    }

    applyTo(el: Thing) {
        if (el.material) {
            var index = el.material().linkedElements.indexOf(el);
            if (index != -1) el.material().linkedElements.splice(index, 1);
        }
        this.linkedElements.push(el);
        this.apply(el.svgElement());
    }
    
}


var DEFAULT_MATERIAL: KnockoutObservable<Material> = ko.observable<Material>(new Material(COLOR_DANGER, BACKGROUND_COLOR, 1.0, 0.25, 2));
var CAM_MATERIAL: KnockoutObservable<Material> = ko.observable<Material>(new Material(CAM_OUTLINE, CAM_BACKGROUND_COLOR, 1.0, 0.75, 2));
var PATH_MATERIAL: KnockoutObservable<Material> = ko.observable<Material>(new Material(COLOR_SUCCESS, BACKGROUND_COLOR, 1.0, 0.0, 2));
var LIGHT_MATERIAL: KnockoutObservable<Material> = ko.observable<Material>(new Material(COLOR_WARNING, BACKGROUND_COLOR, 1.0, 0.25, 0.5));

class Thing {
    paper: Snap.Paper;
    svgElement: KnockoutObservable<Snap.Element>;
    material: KnockoutObservable<Material>;

    pos: KnockoutComputed<Vec2>;
    scale: KnockoutComputed<Vec2>;
    rot: KnockoutComputed<number>;

    transform: KnockoutComputed<Snap.Matrix>;

    svgObserver: MutationObserver;

    cachedTransform: Snap.Matrix;
    cachedTransformInv: Snap.Matrix;

    constructor(s: Snap.Paper) {
        this.paper = s;

        this.cachedTransform = Snap.matrix();
        this.svgObserver = new MutationObserver((recs: MutationRecord[], inst: MutationObserver) => {
            this.svgElement.valueHasMutated();
        });

        this.svgElement = ko.observable<Snap.Element>();

        this.material = DEFAULT_MATERIAL;


        this.transform = ko.computed<Snap.Matrix>({
            read: () => {
                if (!this.svgElement()) return Snap.matrix();
                this.cachedTransform = this.svgElement().transform().globalMatrix;
                this.cachedTransformInv = this.cachedTransform.invert();
                return this.cachedTransform;
            },
            write: (val: Snap.Matrix) => {
                if (!this.svgElement()) return;
                this.cachedTransform = val;
                this.cachedTransformInv = this.cachedTransform.invert();
                this.svgElement().attr({ transform: val });
                this.material().apply(this.svgElement());
            },
            owner: this
        });


        this.pos = ko.computed<Vec2>({
            read: () => {
                var trans = this.transform();
                var split = trans.split();
                return new Vec2(split.dx, split.dy);
            },
            write: (val: Vec2) => {
                var trans = this.transform();
                var split = trans.split();
                trans.translate(-split.dx + val.x, -split.dy + val.y);
                this.transform(trans);
            },
            owner: this
        });

        this.scale = ko.computed<Vec2>({
            read: () => {
                var trans = this.transform();
                var split = trans.split();
                return new Vec2(split.scalex, split.scaley);
            },
            write: (val: Vec2) => {
                var trans = this.transform();
                var split = trans.split();
                trans.scale(val.x / split.scalex, val.y / split.scaley);
                this.transform(trans);
            },
            owner: this
        });

        this.rot = ko.computed<number>({
            read: () => {
                var trans = this.transform();
                var split = trans.split();
                return split.rotate;
            },
            write: (val: number) => {
                var trans = this.transform();
                var split = trans.split();
                trans.rotate(-split.rotate + val);
                this.transform(trans);
            },
            owner: this
        });


    }

    setup() {
        this.svgElement(this.makeSvg(this.paper));

        this.material.subscribe((newValue: Material) => {
            this.material().applyTo(this);
        });

        this.material = DEFAULT_MATERIAL;
        this.material.subscribe((newValue) => { console.log("Test"); newValue.applyTo(this); }, this);

        this.svgObserver.observe(this.svgElement().node, { attributes: true, subtree: true });

        this.svgElement().node.addEventListener("mousewheel", (ev: WheelEvent) => {
            if (ev.shiftKey) {
                this.scale( add(this.scale(), mul(new Vec2(1, 1), ev.wheelDelta * 0.02)));
            } else {
                this.rot(this.rot() + ev.wheelDelta * 0.1);
            }
            ev.preventDefault();
            ev.stopPropagation();
        });

        this.svgElement.valueHasMutated();
    }

    makeSvg(s: Snap.Paper): Snap.Element {
        return null;
    }
}

class Shape extends Thing {

    constructor(s: Snap.Paper) {
        super(s);
    }

    intersect(ray: Ray, result: Intersection): boolean { return false }

    sampleShape(): Vec2 {
        return this.pos();
    }
}



class Light extends Shape {
    constructor(pos: Vec2, rad: number, s: Snap.Paper) {
        super(s);
        this.setup();
        this.pos(pos);
        this.scale(new Vec2(rad, rad));
    }

    intersect(ray: Ray, result: Intersection) {
        ray = transformRay(ray, this.cachedTransformInv);

        var t0: number;
        var t1: number; // solutions for t if the ray intersects 

        var L = mul(ray.o, -1);
        var tca = dot(L, ray.d);

        var d2 = dot(L, L) - tca * tca;
        if (d2 > 1) return false;
        var thc = Math.sqrt(1 - d2);
        t0 = tca - thc;
        t1 = tca + thc;

        if (t0 > t1) {
            var tmp = t0;
            t0 = t1;
            t1 = tmp;
        }

        if (t0 < 0) {
            t0 = t1; // if t0 is negative, let's use t1 instead 
            if (t0 < 0) return false; // both t0 and t1 are negative 
        }

        result.p = add(ray.o, mul(ray.d, t0));
        result.n = normalize(result.p);

        result.p = transformPoint(result.p, this.cachedTransform);
        result.n = transformDir(result.n, this.cachedTransform);

        return true;
    }

    makeSvg(s: Snap.Paper) {
        var g = s.group();

        var circle = s.circle(0, 0, 1);
        LIGHT_MATERIAL().apply(circle);
        g.add(circle);


        var mat = Snap.matrix();

        var xAxis = new Vec2(1, 0);

        var count = 10;

        for (var i = 0; i < count; i++) {
            mat.rotate(360 / count);

            var angle = 360 / count * i;

            var p = mul(transformPoint(xAxis, mat), 5);
            var line = s.line(0, 0, p.x, p.y);
            LIGHT_MATERIAL().apply(line);
            g.add(line);
        }

        LIGHT_MATERIAL().apply(g);

        g.data("thing", this);
        return g;
    }

    sampleShape() {
        return sampleCircle(this.pos(), this.scale().x);
    }
}


class Circle extends Shape {
    constructor(pos: Vec2, rad: number, s: Snap.Paper) {
        super(s);
        this.setup();
        this.pos(pos);
        this.scale(new Vec2(rad, rad));
    }

    intersect(ray: Ray, result: Intersection) {
        ray = transformRay(ray, this.cachedTransformInv);

        var t0: number;
        var t1: number; // solutions for t if the ray intersects 

        var L = mul(ray.o, -1);
        var tca = dot(L, ray.d);

        var d2 = dot(L, L)  - tca * tca;
        if (d2 > 1) return false;
        var thc = Math.sqrt(1 - d2);
        t0 = tca - thc;
        t1 = tca + thc; 

        if (t0 > t1) {
            var tmp = t0;
            t0 = t1;
            t1 = tmp;
        }

        if (t0 < 0) {
            t0 = t1; // if t0 is negative, let's use t1 instead 
            if (t0 < 0) return false; // both t0 and t1 are negative 
        }

        result.p = add(ray.o, mul(ray.d, t0));
        result.n = normalize(result.p);

        result.p = transformPoint(result.p, this.cachedTransform);
        result.n = transformDir(result.n, this.cachedTransform);

        return true; 
    }

    makeSvg(s: Snap.Paper) {
        var el = s.circle(0, 0, 1);
        el.data("thing", this);
        return el;
    }

    sampleShape() {
        return sampleCircle(this.pos(), this.scale().x);
    }
}

var BOX_CORNERS = [
    new Vec2(0, 0),
    new Vec2(1, 0),
    new Vec2(1, 1),
    new Vec2(0, 1)
];

class Box extends Shape {

    constructor(pos: Vec2, size: Vec2, s: Snap.Paper) {
        super(s);
        this.setup();
        this.pos(pos);
        this.scale(size);
    }

    intersect(ray: Ray, result: Intersection) {
        ray = transformRay(ray, this.cachedTransformInv);

        var minDist = 20000000;
        var hitSomething = false;
        for (var i = 0; i < 4; i++) {
            var curr = BOX_CORNERS[i];
            var next = BOX_CORNERS[(i + 1) % 4];
            var intersect = new Intersection();

            if (intersectRayLinesegment(ray, curr, next, intersect)) {
                hitSomething = true;
                var dist = vlength(sub(intersect.p, ray.o));

                if (dist < minDist) {
                    minDist = dist;
                    result.p = intersect.p;
                    result.n = intersect.n;
                }
            }
        }

        if (!hitSomething) return false;

        result.p = transformPoint(result.p, this.cachedTransform);
        result.n = transformDir(result.n, this.cachedTransform);
        return true;
    }

    makeSvg(s: Snap.Paper) {
        var el = s.rect(0, 0, 1, 1);

        el.data("thing", this);

        return el;
    }

}

class Polygon extends Shape {
    points: Vec2[];

    constructor(points: Vec2[], s: Snap.Paper) {
        super(s);
        this.points = points;
        this.setup();
    }

    intersect(ray: Ray, result: Intersection) {
        ray = transformRay(ray, this.cachedTransformInv);

        var minDist = 20000000;
        var hitSomething = false;
        for (var i = 0; i < this.points.length; i++) {
            var curr = this.points[i];
            var next = this.points[(i + 1) % this.points.length];
            var intersect = new Intersection();

            if (intersectRayLinesegment(ray, curr, next, intersect)) {
                hitSomething = true;
                var dist = vlength(sub(intersect.p, ray.o));

                if (dist < minDist) {
                    minDist = dist;
                    result.p = intersect.p;
                    result.n = intersect.n;
                }
            }
        }

        if (!hitSomething) return false;

        result.p = transformPoint(result.p, this.cachedTransform);
        result.n = transformDir(result.n, this.cachedTransform);
        return true;
    }

    makeSvg(s: Snap.Paper) {
        var posArray: number[] = [];

        for (var p of this.points) {
            posArray.push(p.x, p.y );
        }

        var el = s.polygon(posArray);

        el.data("thing", this);

        return el;
    }
}

class Camera extends Thing {

    fov: KnockoutObservable<number>;

    constructor(pos: Vec2, rot: number, s: Snap.Paper) {
        super(s);
        this.fov = ko.observable<number>(60);
        this.setup();
        this.pos(pos);
        this.rot(rot);
    }

    forward() {
        return this.sampleDir(0.5);
    }

    sampleDir(psp: number) {
        var mat = Snap.matrix();
        setRotation(mat, -this.fov() / 2 + this.fov() * psp);
        var dir = transformDir(new Vec2(1, 0), mat);

        return transformDir(dir, this.cachedTransform);
    }

    lookAt(target: Vec2, pos?: Vec2) {
        if (!pos) {
            pos = this.pos();
        } else {
            this.pos(pos);
        }

        var dir = normalize(sub(target, pos));
        var angle = Snap.angle(1, 0, dir.x, dir.y);
        this.rot(angle);
    }

    makeSvg(s: Snap.Paper) {
        var g = s.group();

        var mat = Snap.matrix();
        mat.rotate(-this.fov() / 2);
        var dir = transformDir(new Vec2(1, 0), mat);

        var eyeRadDir = mul(dir, 25);

        var el = s.path(`M 0,0 ${eyeRadDir.x}, ${eyeRadDir.y} A 40, 40 1 0, 1 ${eyeRadDir.x}, ${-eyeRadDir.y} Z`);
        CAM_MATERIAL().apply(el);
        g.add(el);


        dir = mul(dir, 32);

        {
            var line = s.line(0, 0, dir.x, dir.y);
            CAM_MATERIAL().apply(line);
            g.add(line);
        }


        {
            var line = s.line(0, 0, dir.x, -dir.y);
            CAM_MATERIAL().apply(line);
            g.add(line);
        }

        var circle = s.ellipse(19, 0, 2, 4);
        CAM_MATERIAL().apply(circle);
        g.add(circle);


        g.data("thing", this);
        return g;
    }
}

interface Set<T> {
    add(value: T): Set<T>;
    clear(): void;
    delete(value: T): boolean;
    entries(): Array<[T, T]>;
    forEach(callbackfn: (value: T, index: T, set: Set<T>) => void, thisArg?: any): void;
    has(value: T): boolean;
    keys(): Array<T>;
    size: number;
}

interface SetConstructor {
    new <T>(): Set<T>;
    new <T>(iterable: Array<T>): Set<T>;
    prototype: Set<any>;
}
declare var Set: SetConstructor;

class PathData {
    points: Intersection[];
    properties: Set<string>;
}

class Path extends Thing {
    data: PathData;

    constructor(data: PathData, s: Snap.Paper) {
        super(s);
        this.data = data;
        this.setup();
    }

    makeSvg(s: Snap.Paper) {
        var posArray: number[] = [];

        var g = s.group();

        for (var i of this.data.points) {
            posArray.push(i.p.x, i.p.y);

            var normTarget = add(i.p, mul(i.n, 10));
            //var norm = s.line(i.p.x, i.p.y, normTarget.x, normTarget.y);
            //DEFAULT_MATERIAL().apply(norm);
            //g.add(norm);
        }

        var line = s.polyline(posArray);
        PATH_MATERIAL().apply(line);
        g.add(line);

        g.data("thing", this);

        g.attr({ "z-index": -1 });

        PATH_MATERIAL.subscribe(mat => { mat.apply(line); }, this);
        
        return g;
    }
}

interface Sampler {
    tracePath(ray: Ray, depth: number, scene: Scene): PathData[];
}

function setRotation(mat: Snap.Matrix, r: number) {

    var cosr = Math.cos(Snap.rad(r));
    var sinr = Math.sin(Snap.rad(r));

    mat.a = cosr;
    mat.b = sinr;
    mat.c = -sinr;
    mat.d = cosr;
}

class SampleSpaceVisualization {
    canvas: CanvasRenderingContext2D;

    selectedCoordinates: KnockoutObservable< Vec2>;

    constructor(canvas: CanvasRenderingContext2D) {
        this.canvas = canvas;
        this.selectedCoordinates = ko.observable<Vec2>(new Vec2(0.5, 0.5));
    }

    getPath(scene: Scene, cam: Camera, coord: Vec2) {
        var path: PathData = new PathData();

        path.points = [];
        path.properties = new Set<string>();

        var dir = cam.sampleDir(coord.x);

        var primaryRay: Ray = {
            o: add(cam.pos(), mul(dir, 21)),
            d: dir
        };

        path.points.push({ p: primaryRay.o, n: primaryRay.d, shape: null });

        var primaryHit = new Intersection();

        var didHitPrimary = scene.intersect(primaryRay, primaryHit);

        if (!didHitPrimary) {
            path.points.push({ p: add(primaryRay.o, mul(primaryRay.d, 20000)), n: primaryRay.d, shape: null });
            return path;
        }
        path.points.push(primaryHit);

        var secondaryDir = primaryHit.n;
        var mat = Snap.matrix();
        setRotation(mat, -90 + 180 * coord.y);
        secondaryDir = transformDir(secondaryDir, mat);

        var secondaryRay: Ray = {
            o: add(primaryHit.p, mul(secondaryDir, 1)),
            d: secondaryDir
        };

        var secondaryHit = new Intersection();

        var didHitSecondary = scene.intersect(secondaryRay, secondaryHit);

        if (!didHitSecondary) {
            path.points.push({ p: add(secondaryRay.o, mul(secondaryRay.d, 20000)), n: secondaryRay.d, shape: null });
            return path;
        }

        path.points.push(secondaryHit);
        return path;
    }

    update(scene: Scene, cam: Camera) {
        var width = this.canvas.canvas.width;
        var height = this.canvas.canvas.width;

        var newDataObj = this.canvas.createImageData(width, height);

        var newData = newDataObj.data;

        var mat = Snap.matrix();

        for (var x = 0; x < width; x++) {
            var dir = cam.sampleDir(x / width);

            var primaryRay: Ray = {
                o: cam.pos(),
                d: dir
            };

            var primaryHit = new Intersection();

            var didHitPrimary = scene.intersect(primaryRay, primaryHit);

            for (var y = 0; y < height; y++) {

                var pixelIndex = (x + width * y) * 4;
                if (!didHitPrimary) {
                    newData[pixelIndex+0] = 0;
                    newData[pixelIndex+1] = 0;
                    newData[pixelIndex+2] = 0;
                    newData[pixelIndex + 3] = 255;
                    continue;
                }


                var secondaryDir = primaryHit.n;

                setRotation(mat, -90 + 180 * y / height);
                secondaryDir = transformDir(secondaryDir, mat);

                var secondaryRay: Ray = {
                    o: add(primaryHit.p, mul(secondaryDir, 1)),
                    d: secondaryDir
                };

                var secondaryHit = new Intersection();

                var didHitSecondary = scene.intersect(secondaryRay, secondaryHit);

                if (!didHitSecondary) {
                    newData[pixelIndex + 0] = 100;
                    newData[pixelIndex + 1] = 100;
                    newData[pixelIndex + 2] = 100;
                    newData[pixelIndex + 3] = 255;
                    continue;
                }

                newData[pixelIndex + 0] = 200
                newData[pixelIndex + 1] = 200;
                newData[pixelIndex + 2] = 200;
                newData[pixelIndex + 3] = 255;
            }
        }

        this.canvas.putImageData(newDataObj, 0, 0);

        this.canvas.lineWidth = 2;
        this.canvas.strokeStyle = COLOR_INFO().hex;
        this.canvas.beginPath();
        this.canvas.moveTo(this.selectedCoordinates().x * width, 0);
        this.canvas.lineTo(this.selectedCoordinates().x * width, height);
        this.canvas.stroke();

        this.canvas.strokeStyle = COLOR_WARNING().hex;
        this.canvas.beginPath();
        this.canvas.arc(this.selectedCoordinates().x * width, this.selectedCoordinates().y * height, 2, 0, 360);
        this.canvas.stroke();
    }
}


class Scene extends Shape {

    renderPathDensity: KnockoutObservable<boolean>;
    visualizePrimarySampleSpace: KnockoutObservable<boolean>;

    sampleSpaceVis: SampleSpaceVisualization;

    shapes: KnockoutObservableArray<Shape>;

    paths: Path[];

    cameras: KnockoutObservableArray<Camera>;

    materials: KnockoutObservableArray<Material>;

    sampler: Sampler;

    canvas: CanvasRenderingContext2D;

    renderedPathsCount: KnockoutObservable<number>;

    lights: KnockoutObservableArray<Shape>;


    constructor(sampler : Sampler, s: Snap.Paper) {
        super(s);

        this.visualizePrimarySampleSpace = ko.observable<boolean>(false);
        this.renderedPathsCount = ko.observable<number>(0);
        this.renderPathDensity = ko.observable<boolean>(false);
        this.sampler = sampler;
        this.shapes = ko.observableArray<Shape>([]);
        this.lights = ko.observableArray<Shape>([]);
        this.paths = [];
        this.cameras = ko.observableArray<Camera>([]);
        this.materials = ko.observableArray<Material>([]);
        this.setup();

        $(this.svgElement().node).off("mouswheel");
        s.undrag();

        sampleDirFunc.subscribe((newVal) => this.recalculatePaths(), this);

        this.svgElement.subscribe((newVal) => this.recalculatePaths(), this);
        this.renderPathDensity.subscribe((newVal) => this.recalculatePaths(), this);
    }

    sampleLight() {
        var lightIndex = Math.floor(this.lights().length * Math.random());

        var light = this.lights()[lightIndex];
        return light.sampleShape();
    }

    recalculatePaths() {

        for (var path of this.paths) {
            path.svgElement().remove();
        }

        this.paths = [];
        this.renderedPathsCount(0);
        this.canvas.clearRect(0, 0, 10000, 10000);

        if (this.renderPathDensity()) {
            window.requestAnimationFrame(() => this.updateDensity());
        } else if (!this.visualizePrimarySampleSpace()) {
            for (var cam of this.cameras()) {
                var fwd = cam.forward();
                var startRay = new Ray(add(cam.pos(), mul(fwd, 21)), fwd);
                var newPaths = this.sampler.tracePath(startRay, 3, this);
                for (var p of newPaths) {
                    var path = new Path(p, this.paper);
                    this.paths.push(path);
                }
            }
        }

        if (this.visualizePrimarySampleSpace()) {
            this.sampleSpaceVis.update(this, this.cameras()[0]);

            var p = this.sampleSpaceVis.getPath(this, this.cameras()[0], this.sampleSpaceVis.selectedCoordinates());
            var path = new Path(p, this.paper);
            this.paths.push(path);
        }

    }


    updateDensity() {
        if (!this.renderPathDensity()) return;

        this.canvas.globalCompositeOperation = "soft-light";

        for (var cam of this.cameras()) {
            var fwd = cam.forward();
            var startRay = new Ray(add(cam.pos(), mul(fwd, 21)), fwd);

            var renderPaths: PathData[] = [];

            for (var i = 0; i < 4; i++) {
                var newPaths = this.sampler.tracePath(startRay, 4, this);
                for (var p of newPaths) {
                    renderPaths.push(p);
                }
            }

            this.renderedPathsCount(this.renderedPathsCount() + 10);

            this.canvas.strokeStyle = PATH_MATERIAL().outlineColor().hex;

            this.canvas.lineWidth = 0.4;
            this.canvas.globalAlpha = 0.02;

            for (var p of renderPaths) {
                this.canvas.strokeStyle = p.properties.has("HitLight") ? COLOR_WARNING().hex : COLOR_INFO().hex;

                this.canvas.beginPath();
                this.canvas.moveTo(p.points[0].p.x, p.points[0].p.y);
                for (var point of p.points) {
                    this.canvas.lineTo(point.p.x, point.p.y);
                }
                this.canvas.stroke();
            }
        }

        if (this.renderedPathsCount() < 50000) {
            window.requestAnimationFrame(() => this.updateDensity());
        }
    }

    removeThing(thing: Thing) {
        if (thing instanceof Camera) {
            this.cameras.remove(<Camera>thing);
        } else if (thing instanceof Shape) {
            this.shapes.remove(<Shape>thing);
        } 

        if (thing instanceof Light) {
            this.lights.remove(<Light>thing);
        }

        thing.svgElement().remove();
        this.recalculatePaths();
    }

    addCamera(cam: Camera) {
        this.cameras.push(cam);
        this.svgElement().add(cam.svgElement());
        cam.svgElement().drag();
    }

    addShape(shape: Shape) {
        this.shapes.push(shape);
        if (shape instanceof Light) this.lights.push(shape);
        this.svgElement().add(shape.svgElement());
        shape.svgElement().drag();
    }

    intersect(ray: Ray, result: Intersection) {
        var minDist: number = 2000000;
        var hitSomething = false;
        for (var shape of this.shapes()) {
            var intersect: Intersection = new Intersection();
            if (shape.intersect(ray, intersect)) {
                hitSomething = true;
                var dist = vlength(sub(ray.o, intersect.p));
                if (dist < minDist) {
                    result.p = intersect.p;
                    result.n = intersect.n;
                    result.shape = shape;
                    minDist = dist;
                }
            }
        }

        return hitSomething;
    }

    test(a: Vec2, b: Vec2) {
        var r: Ray = {
            o: a, d: normalize(sub(b, a))
        };

        var res: Intersection = new Intersection();
        if (!this.intersect(r, res)) {
            return false;
        }

        var dist = vlength(sub(res.p, b));
        if (dist > 2) return false;
        return true;
    }

    makeSvg(s: Snap.Paper) {
        var elements: Snap.Element[] = [];
        var group = s.group();
        
        group.data("thing", this);

        return group;
    }
}


class SinglePathSampler implements Sampler {
    tracePath(ray: Ray, depth: number, scene: Scene): PathData[] {
        var path: PathData = new PathData();
        path.points = [];
        path.properties = new Set<string>();

        path.points.push({ p: ray.o, n: ray.d, shape: null});

        for (var i = 0; i < depth; i++) {
            var intersect: Intersection = new Intersection();

            if (!scene.intersect(ray, intersect)) {
                path.points.push({ p: add(ray.o, mul(ray.d, 20000)), n: ray.d, shape: null});
                break;
            }

            path.points.push(intersect);

            if (intersect.shape instanceof Light) {
                path.properties.add("HitLight");
                break;
            }

            ray.o = intersect.p;
            ray.d = reflect(ray.d, intersect.n);
            ray.o = add(ray.o, mul(ray.d, 0.1));

        }


        return [path];
    }
}


var sampleDirFunc = ko.observable<(intersect: Intersection, ray: Ray, scene: Scene) => Vec2[]>();

class ScriptedPathSampler implements Sampler {

    sampleDir: KnockoutObservable<(intersect: Intersection, ray: Ray, scene: Scene) => Vec2[]>;

    tracePath(ray: Ray, depth: number, scene: Scene): PathData[] {

        if (depth < 0) return [];

        var sampleDir = this.sampleDir();

        if (!sampleDir) {
            return [];
        }

        var path: PathData = new PathData();
        var result: PathData[] = [];
        result.push(path);

        path.properties = new Set<string>();

        path.points = [];
        path.points.push({ p: ray.o, n: ray.d, shape: null });

        var intersect: Intersection = new Intersection();

        if (!scene.intersect(ray, intersect)) {
            path.points.push({ p: add(ray.o, mul(ray.d, 20000)), n: ray.d, shape: null });
            return result;
        }

        path.points.push(intersect);
        

        if (intersect.shape instanceof Light) {
            path.properties.add("HitLight");
            return result;
        }

        var dirs: Vec2[];

        try {
            dirs = sampleDir(intersect, ray, scene);
        } catch (runtimeError) {
            $("#code-footer").text("Sample Error:" + runtimeError.name + "-" + runtimeError.message);
            return result;
        }

        
        for (var dir of dirs) {
            var r: Ray = {
                o: add(intersect.p, mul(dir, 1)),
                d: dir
            };

            var newPaths: PathData[];

            try {
                newPaths = this.tracePath(r, depth - 1, scene);
            } catch (runtimeError) {
                $("#code-footer").text("Trace Path Error:" + runtimeError.name + "-" + runtimeError.message);

                return result;
            }

            for (var newPath of newPaths) {
                newPath.properties.forEach((value, index, set) => {
                    path.properties.add(value);
                }, this);

                result.push(newPath);
            }
        }

        return result;
    }
}


function makeRaySVG(s: Snap.Paper, r: Ray, length: number) {
    var target = add(r.o, mul(r.d, length));
    return s.line(r.o.x, r.o.y, target.x, target.y);
}

declare function unescape(s:string): string;

var s: Snap.Paper;
var scene: Scene;

function toDataUrl(e: Snap.Element, maxWidth: number, maxHeight: number) {
    var bb = e.getBBox();

    var x = Math.max(+bb.x.toFixed(3), 0) - 3;
    var y = Math.max(+ bb.y.toFixed(3), 0) - 3;

    var w = Math.min(+ bb.width.toFixed(3), maxWidth) + x + 3;
    var h = Math.min(+ bb.height.toFixed(3), maxHeight) + y + 3;

    var img: Snap.Element;

    if (scene.renderPathDensity()) {
        var canvas = <HTMLCanvasElement>document.getElementById("density");
        var imageStrg = canvas.toDataURL();
        img = s.image(imageStrg, 0, 0, maxWidth, maxHeight);
    }
    
    var svg = Snap.format('<svg version="1.2" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="{width}" height="{height}" viewBox="{x} {y} {width} {height}">{contents}</svg>', {
        x: x,
        y: y,
        width: w,
        height: h,
        contents: e.outerSVG()
    });


    if (img) {
        svg = svg.replace("href", "xlink:href");
        img.remove();
    }

    return "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svg)));
}



window.onload = () => {
    s = Snap("#svg-container");

    var cam = new Camera(new Vec2(100, 100), 45, s);

    CAM_MATERIAL().applyTo(cam);

    var pathSampler = new ScriptedPathSampler();
    pathSampler.sampleDir = sampleDirFunc;
    scene = new Scene(pathSampler, s);
    var canvas = <HTMLCanvasElement>document.getElementById("density");
    var svgEl = document.getElementById("svg-container");
    var width = $(svgEl).width();
    var height = $(svgEl).height();

    window.addEventListener("resize", () => {
        canvas.width = $(svgEl).width();
        canvas.height = $(svgEl).height();
        scene.recalculatePaths();
    }, true);

    var svgEl = document.getElementById("svg-container");
    var width = $(svgEl).width();
    var height = $(svgEl).height();
    canvas.width = width;
    canvas.height = height;
    scene.canvas = <CanvasRenderingContext2D>canvas.getContext("2d");

    var sampleCanvas = <HTMLCanvasElement>document.getElementById("sample-space");


    sampleCanvas.width = $(sampleCanvas).width() * 2;
    sampleCanvas.height = sampleCanvas.width;

    scene.sampleSpaceVis = new SampleSpaceVisualization(<CanvasRenderingContext2D>sampleCanvas.getContext("2d"));
    sampleCanvas.addEventListener("mousemove", (e: MouseEvent) => {
        if (e.button == 0 && !e.shiftKey) return;
        var x = (e.pageX - sampleCanvas.offsetLeft) / sampleCanvas.offsetWidth;
        var y = (e.pageY - sampleCanvas.offsetTop) / sampleCanvas.offsetHeight;

        console.log(new Vec2(x, y));

        scene.sampleSpaceVis.selectedCoordinates(new Vec2(x, y));
        scene.recalculatePaths();
    }, this);

    scene.addCamera(cam);

    scene.addShape(new Circle(new Vec2(250, 280), 50, s));

    scene.addShape(new Light(new Vec2(300, 200), 4, s));

    var deformedCircle = new Circle(new Vec2(250, 150), 30, s);
    deformedCircle.scale(new Vec2(30.0, 10.0));
    deformedCircle.rot(0);
    scene.addShape(deformedCircle);
    scene.addShape(new Box(new Vec2(250, 50), new Vec2(20, 40), s));

    var mat = Snap.matrix();

    var points: Vec2[] = [];

    var xAxis = new Vec2(1, 0);

    var count = 40;

    for (var i = 0; i < count; i++) {
        mat.rotate(360 / count);

        var angle = 360 / count * i;

        var p = transformPoint(xAxis, mat);
        points.push(mul(p, Math.sin(angle * 4) * 0.5 * Math.cos(angle + 10) + 2.0));
    }

    var poly = new Polygon(points, s);

    poly.scale(new Vec2(40, 40));

    scene.addShape(poly);

    ko.applyBindings(scene);
}

function saveSvg() {
    var svgEl = document.getElementById("svg-container");
    var width = $(svgEl).width();
    var height = $(svgEl).height();


    var saveButton = document.getElementById("save-button");
    saveButton.setAttribute("href", toDataUrl(s, width, height));
}