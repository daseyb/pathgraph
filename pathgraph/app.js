/// <reference path="node_modules/@types/snapsvg/index.d.ts"/>
/// <reference path="node_modules/@types/knockout/index.d.ts"/>
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var Vec2 = (function () {
    function Vec2(x, y) {
        this.x = x;
        this.y = y;
    }
    Vec2.prototype.toString = function () {
        return "(" + this.x + ", " + this.y + ")";
    };
    return Vec2;
}());
function add(a, b) {
    return new Vec2(a.x + b.x, a.y + b.y);
}
function sub(a, b) {
    return new Vec2(a.x - b.x, a.y - b.y);
}
function mulV(a, b) {
    return new Vec2(a.x * b.x, a.y * b.y);
}
function mul(a, b) {
    return new Vec2(a.x * b, a.y * b);
}
function dot(a, b) {
    return a.x * b.x + a.y * b.y;
}
function vlength(a) {
    return Math.sqrt(dot(a, a));
}
function normalize(a) {
    var len = vlength(a);
    return new Vec2(a.x / len, a.y / len);
}
function reflect(i, n) {
    i = mul(i, 1);
    return sub(i, mul(n, 2.0 * dot(n, i)));
}
function cross(a, b) {
    return a.x * b.y - a.y * b.x;
}
function perp(a) {
    return new Vec2(-a.y, a.x);
}
var Ray = (function () {
    function Ray(o, d) {
        this.o = o;
        this.d = d;
    }
    return Ray;
}());
function sign(f) {
    return f < 0 ? -1 : 1;
}
function intersectRayLinesegment(r, a, b, result) {
    var v1 = sub(r.o, a);
    var v2 = sub(b, a);
    var v3 = perp(r.d);
    var t1 = cross(v2, v1) / dot(v2, v3);
    var t2 = dot(v1, v3) / dot(v2, v3);
    if (t1 < 0 || t2 < 0 || t2 > 1)
        return false;
    result.p = add(r.o, mul(r.d, t1));
    result.n = perp(v2);
    result.n = mul(result.n, -sign(dot(result.n, r.d)));
    return true;
}
var Intersection = (function () {
    function Intersection() {
    }
    return Intersection;
}());
function transformPoint(a, mat) {
    return new Vec2(mat.x(a.x, a.y), mat.y(a.x, a.y));
}
function transpose(mat) {
    return Snap.matrix(mat.d, mat.c, mat.b, mat.a, 0, 0);
}
function transformDir(a, mat) {
    var dirTrans = transpose(mat.invert());
    return normalize(transformPoint(a, dirTrans));
}
function transformRay(ray, mat) {
    return new Ray(transformPoint(ray.o, mat), transformDir(ray.d, mat));
}
var Material = (function () {
    function Material(outlineColor, fillColor, outlineOpacity, fillOpacity, outlineWidth) {
        this.outlineColor = outlineColor;
        this.fillColor = fillColor;
        this.outlineOpacity = outlineOpacity;
        this.fillOpacity = fillOpacity;
        this.outlineWidth = outlineWidth;
        this.linkedElements = [];
    }
    Material.prototype.update = function () {
        for (var _i = 0, _a = this.linkedElements; _i < _a.length; _i++) {
            var el = _a[_i];
            this.apply(el.svgElement);
        }
    };
    Material.prototype.apply = function (el) {
        el.attr({
            fill: this.fillOpacity > 0.01 ? this.fillColor : "none",
            stroke: this.outlineColor,
            strokeWidth: this.outlineWidth,
            "fill-opacity": this.fillOpacity,
            "stroke-opacity": this.outlineOpacity,
            "vector-effect": "non-scaling-stroke",
        });
    };
    Material.prototype.applyTo = function (el) {
        if (el.material) {
            var index = el.material.linkedElements.indexOf(el);
            if (index != -1)
                el.material.linkedElements.splice(index, 1);
        }
        el.material = this;
        this.linkedElements.push(el);
        this.apply(el.svgElement);
    };
    return Material;
}());
var DEFAULT_MATERIAL = new Material(Snap.rgb(255, 0, 0), Snap.rgb(200, 200, 200), 1.0, 0.5, 2);
var CAM_MATERIAL = new Material(Snap.rgb(0, 0, 0), Snap.rgb(200, 200, 200), 1.0, 0.5, 2);
var PATH_MATERIAL = new Material(Snap.rgb(0, 255, 0), Snap.rgb(200, 200, 200), 1.0, 0.0, 2);
var Thing = (function () {
    function Thing(s) {
        this.paper = s;
    }
    Thing.prototype.setup = function () {
        this.svgElement = this.makeSvg(this.paper);
        this.setMaterial(DEFAULT_MATERIAL);
    };
    Thing.prototype.setMaterial = function (mat) {
        this.material = mat;
        this.material.applyTo(this);
    };
    Thing.prototype.transform = function () {
        return this.svgElement.transform().globalMatrix;
    };
    Thing.prototype.pos = function () {
        var trans = this.transform();
        var split = trans.split();
        return new Vec2(split.dx, split.dy);
    };
    Thing.prototype.rot = function () {
        var trans = this.transform();
        var split = trans.split();
        return split.rotate;
    };
    Thing.prototype.scale = function () {
        var trans = this.transform();
        var split = trans.split();
        return new Vec2(split.scalex, split.scaley);
    };
    Thing.prototype.setTransform = function (mat) {
        this.svgElement.attr({ transform: mat });
    };
    Thing.prototype.setPos = function (pos) {
        var trans = this.transform();
        var split = trans.split();
        trans.translate(-split.dx + pos.x, -split.dy + pos.y);
        this.setTransform(trans);
    };
    Thing.prototype.setRotation = function (rot) {
        var trans = this.transform();
        var split = trans.split();
        trans.rotate(-split.rotate + rot);
        this.setTransform(trans);
    };
    Thing.prototype.setScale = function (scale) {
        var trans = this.transform();
        var split = trans.split();
        trans.scale(scale.x / split.scalex, scale.y / split.scaley);
        this.setTransform(trans);
    };
    Thing.prototype.makeSvg = function (s) {
        return null;
    };
    return Thing;
}());
var Shape = (function (_super) {
    __extends(Shape, _super);
    function Shape(s) {
        _super.call(this, s);
    }
    Shape.prototype.intersect = function (ray, result) { return false; };
    return Shape;
}(Thing));
var Circle = (function (_super) {
    __extends(Circle, _super);
    function Circle(pos, rad, s) {
        _super.call(this, s);
        this.setup();
        this.setPos(pos);
        this.setScale(new Vec2(rad, rad));
    }
    Circle.prototype.intersect = function (ray, result) {
        ray = transformRay(ray, this.transform().invert());
        var t0;
        var t1; // solutions for t if the ray intersects 
        var L = mul(ray.o, -1);
        var tca = dot(L, ray.d);
        var d2 = dot(L, L) - tca * tca;
        if (d2 > 1)
            return false;
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
            if (t0 < 0)
                return false; // both t0 and t1 are negative 
        }
        result.p = add(ray.o, mul(ray.d, t0));
        result.n = normalize(result.p);
        result.p = transformPoint(result.p, this.transform());
        result.n = transformDir(result.n, this.transform());
        return true;
    };
    Circle.prototype.makeSvg = function (s) {
        var el = s.circle(0, 0, 1);
        el.data("thing", this);
        return el;
    };
    return Circle;
}(Shape));
var Box = (function (_super) {
    __extends(Box, _super);
    function Box(pos, size, s) {
        _super.call(this, s);
        this.setup();
        this.setPos(pos);
        this.setScale(size);
    }
    Box.prototype.intersect = function (ray, result) {
        ray = transformRay(ray, this.transform().invert());
        var corners = [
            new Vec2(0, 0),
            new Vec2(1, 0),
            new Vec2(1, 1),
            new Vec2(0, 1)
        ];
        var minDist = 20000000;
        var hitSomething = false;
        for (var i = 0; i < 4; i++) {
            var curr = corners[i];
            var next = corners[(i + 1) % 4];
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
        if (!hitSomething)
            return false;
        result.p = transformPoint(result.p, this.transform());
        result.n = transformDir(result.n, this.transform());
        return true;
    };
    Box.prototype.makeSvg = function (s) {
        var el = s.rect(0, 0, 1, 1);
        el.data("thing", this);
        return el;
    };
    return Box;
}(Shape));
var Polygon = (function (_super) {
    __extends(Polygon, _super);
    function Polygon(points, s) {
        _super.call(this, s);
        this.points = points;
        this.setup();
    }
    Polygon.prototype.intersect = function (ray, result) {
        ray = transformRay(ray, this.transform().invert());
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
        if (!hitSomething)
            return false;
        result.p = transformPoint(result.p, this.transform());
        result.n = transformDir(result.n, this.transform());
        return true;
    };
    Polygon.prototype.makeSvg = function (s) {
        var posArray = [];
        for (var _i = 0, _a = this.points; _i < _a.length; _i++) {
            var p = _a[_i];
            posArray.push(p.x, p.y);
        }
        var el = s.polygon(posArray);
        el.data("thing", this);
        return el;
    };
    return Polygon;
}(Shape));
var Camera = (function (_super) {
    __extends(Camera, _super);
    function Camera(pos, rot, s) {
        _super.call(this, s);
        this.setup();
        this.setPos(pos);
        this.setRotation(rot);
    }
    Camera.prototype.forward = function () {
        return transformDir(new Vec2(1, 0), this.transform());
    };
    Camera.prototype.lookAt = function (target, pos) {
        var trans = this.transform().split();
        if (!pos) {
            pos = new Vec2(trans.dx, trans.dy);
        }
        else {
            this.setPos(pos);
        }
        var dir = normalize(sub(target, pos));
        var angle = Snap.angle(1, 0, dir.x, dir.y);
        this.setRotation(angle);
    };
    Camera.prototype.makeSvg = function (s) {
        var el = s.path("M 0,0 30,30 A 60,60 1 0,0 30,-30 Z");
        el.data("thing", this);
        return el;
    };
    return Camera;
}(Thing));
var PathData = (function () {
    function PathData() {
    }
    return PathData;
}());
var Path = (function (_super) {
    __extends(Path, _super);
    function Path(data, s) {
        _super.call(this, s);
        this.data = data;
        this.setup();
    }
    Path.prototype.makeSvg = function (s) {
        var posArray = [];
        var g = s.group();
        for (var _i = 0, _a = this.data.points; _i < _a.length; _i++) {
            var i = _a[_i];
            posArray.push(i.p.x, i.p.y);
            var normTarget = add(i.p, mul(i.n, 10));
            var norm = s.line(i.p.x, i.p.y, normTarget.x, normTarget.y);
            DEFAULT_MATERIAL.apply(norm);
            g.add(norm);
        }
        var line = s.polyline(posArray);
        PATH_MATERIAL.apply(line);
        g.add(line);
        g.data("thing", this);
        g.attr({ "z-index": -1 });
        return g;
    };
    return Path;
}(Thing));
var Scene = (function (_super) {
    __extends(Scene, _super);
    function Scene(sampler, s) {
        _super.call(this, s);
        this.sampler = sampler;
        this.shapes = ko.observableArray([]);
        this.paths = [];
        this.cameras = ko.observableArray([]);
        this.materials = ko.observableArray([]);
        this.setup();
        s.drag(this.onMove, null, this.onDragEnd, this, this, this);
        this.recalculatePaths();
    }
    Scene.prototype.onDragEnd = function (event) {
        this.recalculatePaths();
    };
    Scene.prototype.onMove = function (dx, dy, x, y, event) {
        this.recalculatePaths();
    };
    Scene.prototype.recalculatePaths = function () {
        for (var _i = 0, _a = this.paths; _i < _a.length; _i++) {
            var path = _a[_i];
            path.svgElement.remove();
        }
        this.paths = [];
        for (var _b = 0, _c = this.cameras(); _b < _c.length; _b++) {
            var cam = _c[_b];
            var startRay = new Ray(cam.pos(), cam.forward());
            var newPaths = this.sampler.tracePath(startRay, 10, this);
            for (var _d = 0, newPaths_1 = newPaths; _d < newPaths_1.length; _d++) {
                var p = newPaths_1[_d];
                var path = new Path(p, this.paper);
                this.paths.push(path);
            }
        }
    };
    Scene.prototype.addCamera = function (cam) {
        this.cameras.push(cam);
        cam.svgElement.drag();
        this.recalculatePaths();
    };
    Scene.prototype.addShape = function (shape) {
        this.shapes.push(shape);
        this.svgElement.add(shape.svgElement);
        shape.svgElement.drag();
        this.recalculatePaths();
    };
    Scene.prototype.intersect = function (ray, result) {
        var minDist = 2000000;
        var hitSomething = false;
        for (var _i = 0, _a = this.shapes(); _i < _a.length; _i++) {
            var shape = _a[_i];
            var intersect = new Intersection();
            if (shape.intersect(ray, intersect)) {
                hitSomething = true;
                var dist = vlength(sub(ray.o, intersect.p));
                if (dist < minDist) {
                    result.p = intersect.p;
                    result.n = intersect.n;
                    minDist = dist;
                }
            }
        }
        return hitSomething;
    };
    Scene.prototype.makeSvg = function (s) {
        var elements = [];
        var group = s.group();
        group.data("thing", this);
        return group;
    };
    return Scene;
}(Shape));
var SinglePathSampler = (function () {
    function SinglePathSampler() {
    }
    SinglePathSampler.prototype.tracePath = function (ray, depth, scene) {
        var path = new PathData();
        path.points = [];
        path.points.push({ p: ray.o, n: ray.d });
        for (var i = 0; i < depth; i++) {
            var intersect = new Intersection();
            if (!scene.intersect(ray, intersect)) {
                path.points.push({ p: add(ray.o, mul(ray.d, 20000)), n: ray.d });
                break;
            }
            path.points.push(intersect);
            ray.o = intersect.p;
            ray.d = reflect(ray.d, intersect.n);
            ray.o = add(ray.o, mul(ray.d, 0.1));
        }
        return [path];
    };
    return SinglePathSampler;
}());
function makeRaySVG(s, r, length) {
    var target = add(r.o, mul(r.d, length));
    return s.line(r.o.x, r.o.y, target.x, target.y);
}
function toDataUrl(e, maxWidth, maxHeight) {
    var bb = e.getBBox();
    var svg = Snap.format('<svg version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="{width}" height="{height}" viewBox="{x} {y} {width} {height}">{contents}</svg>', {
        x: Math.max(+bb.x.toFixed(3), 0),
        y: Math.max(+bb.y.toFixed(3), 0),
        width: Math.min(+bb.width.toFixed(3), maxWidth),
        height: Math.min(+bb.height.toFixed(3), maxHeight),
        contents: e.outerSVG()
    });
    return "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svg)));
}
var s;
window.onload = function () {
    s = Snap("#svg-container");
    var cam = new Camera(new Vec2(100, 100), 45, s);
    CAM_MATERIAL.applyTo(cam);
    var scene = new Scene(new SinglePathSampler(), s);
    scene.addCamera(cam);
    scene.addShape(new Circle(new Vec2(150, 150), 50, s));
    var deformedCircle = new Circle(new Vec2(250, 150), 30, s);
    deformedCircle.setScale(new Vec2(30.0, 10.0));
    deformedCircle.setRotation(0);
    scene.addShape(deformedCircle);
    scene.addShape(new Box(new Vec2(250, 50), new Vec2(20, 40), s));
    var mat = Snap.matrix();
    var points = [];
    var xAxis = new Vec2(1, 0);
    var count = 40;
    for (var i = 0; i < count; i++) {
        mat.rotate(360 / count);
        var angle = 360 / count * i;
        var p = transformPoint(xAxis, mat);
        points.push(mul(p, Math.sin(angle * 4) * 0.5 * Math.cos(angle + 10) + 2.0));
    }
    var poly = new Polygon(points, s);
    poly.setScale(new Vec2(40, 40));
    scene.addShape(poly);
    ko.applyBindings(scene);
};
function saveSvg() {
    var svgEl = document.getElementById("svg-container");
    var width = svgEl.clientWidth;
    var height = svgEl.clientHeight;
    var saveButton = document.getElementById("save-button");
    saveButton.setAttribute("href", toDataUrl(s, width, height));
}
//# sourceMappingURL=app.js.map