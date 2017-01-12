/// <reference path="node_modules/@types/snapsvg/index.d.ts"/>
/// <reference path="node_modules/@types/knockout/index.d.ts"/>
/// <reference path="node_modules/@types/jquery/index.d.ts"/>
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var COLOR_PRIMARY = ko.observable(Snap.getRGB("#2C3E50"));
var COLOR_SUCCESS = ko.observable(Snap.getRGB("#18BC9C"));
var COLOR_INFO = ko.observable(Snap.getRGB("#3498DB"));
var COLOR_WARNING = ko.observable(Snap.getRGB("#F39C12"));
var COLOR_DANGER = ko.observable(Snap.getRGB("#E74C3C"));
var BACKGROUND_COLOR = ko.observable(Snap.getRGB("rgb(200, 200, 200)"));
var CAM_OUTLINE = COLOR_PRIMARY; // ko.observable<Snap.RGB>(Snap.getRGB("rgb(60, 60, 60)"));
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
function refract(i, n, eta) {
    var NdotI = dot(n, i);
    var k = 1.0 - eta * eta * (1.0 - NdotI * NdotI);
    if (k < 0.0)
        return new Vec2(0, 0);
    else
        return sub(mul(i, eta), mul(n, eta * NdotI + Math.sqrt(k)));
}
function cross(a, b) {
    return a.x * b.y - a.y * b.x;
}
function perp(a) {
    return new Vec2(-a.y, a.x);
}
function uniformSampleHemisphere(n) {
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
function cosineSampleHemisphere(n) {
    var Xi1 = Math.random();
    var Xi2 = Math.random();
    var theta = Xi1;
    var phi = 2.0 * Math.PI * Xi2;
    var f = Math.sqrt(1 - theta);
    var x = f * Math.cos(phi);
    var y = Math.sqrt(theta);
    var xDir = perp(n);
    return add(mul(xDir, x), mul(n, y));
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
        var _this = this;
        this.outlineColor = outlineColor;
        this.fillColor = fillColor;
        this.outlineOpacity = outlineOpacity;
        this.fillOpacity = fillOpacity;
        this.outlineWidth = outlineWidth;
        this.linkedElements = [];
        this.outlineColor.subscribe(function (newValue) { _this.update(); });
        this.fillColor.subscribe(function (newValue) { _this.update(); });
    }
    Material.prototype.update = function () {
        for (var _i = 0, _a = this.linkedElements; _i < _a.length; _i++) {
            var el = _a[_i];
            this.apply(el.svgElement());
        }
    };
    Material.prototype.apply = function (el) {
        el.attr({
            fill: this.fillOpacity > 0.01 ? this.fillColor().hex : "none",
            stroke: this.outlineColor().hex,
            strokeWidth: this.outlineWidth / (el.transform().localMatrix ? el.transform().localMatrix.split().scalex : 1),
            "fill-opacity": this.fillOpacity,
            "stroke-opacity": this.outlineOpacity,
        });
    };
    Material.prototype.applyTo = function (el) {
        if (el.material) {
            var index = el.material().linkedElements.indexOf(el);
            if (index != -1)
                el.material().linkedElements.splice(index, 1);
        }
        this.linkedElements.push(el);
        this.apply(el.svgElement());
    };
    return Material;
}());
var DEFAULT_MATERIAL = ko.observable(new Material(COLOR_DANGER, BACKGROUND_COLOR, 1.0, 0.25, 2));
var CAM_MATERIAL = ko.observable(new Material(CAM_OUTLINE, BACKGROUND_COLOR, 1.0, 0.25, 2));
var PATH_MATERIAL = ko.observable(new Material(COLOR_SUCCESS, BACKGROUND_COLOR, 1.0, 0.0, 2));
var LIGHT_MATERIAL = ko.observable(new Material(COLOR_WARNING, BACKGROUND_COLOR, 1.0, 0.25, 0.5));
var Thing = (function () {
    function Thing(s) {
        var _this = this;
        this.paper = s;
        this.svgObserver = new MutationObserver(function (recs, inst) {
            _this.svgElement.valueHasMutated();
        });
        this.svgElement = ko.observable();
        this.material = DEFAULT_MATERIAL;
        this.transform = ko.computed({
            read: function () {
                if (!_this.svgElement())
                    return Snap.matrix();
                var trans = _this.svgElement().transform().globalMatrix;
                return trans;
            },
            write: function (val) {
                if (!_this.svgElement())
                    return;
                _this.svgElement().attr({ transform: val });
                _this.material().apply(_this.svgElement());
            },
            owner: this
        });
        this.pos = ko.computed({
            read: function () {
                var trans = _this.transform();
                var split = trans.split();
                return new Vec2(split.dx, split.dy);
            },
            write: function (val) {
                var trans = _this.transform();
                var split = trans.split();
                trans.translate(-split.dx + val.x, -split.dy + val.y);
                _this.transform(trans);
            },
            owner: this
        });
        this.scale = ko.computed({
            read: function () {
                var trans = _this.transform();
                var split = trans.split();
                return new Vec2(split.scalex, split.scaley);
            },
            write: function (val) {
                var trans = _this.transform();
                var split = trans.split();
                trans.scale(val.x / split.scalex, val.y / split.scaley);
                _this.transform(trans);
            },
            owner: this
        });
        this.rot = ko.computed({
            read: function () {
                var trans = _this.transform();
                var split = trans.split();
                return split.rotate;
            },
            write: function (val) {
                var trans = _this.transform();
                var split = trans.split();
                trans.rotate(-split.rotate + val);
                _this.transform(trans);
            },
            owner: this
        });
    }
    Thing.prototype.setup = function () {
        var _this = this;
        this.svgElement(this.makeSvg(this.paper));
        this.material.subscribe(function (newValue) {
            _this.material().applyTo(_this);
        });
        this.material = DEFAULT_MATERIAL;
        this.material.subscribe(function (newValue) { console.log("Test"); newValue.applyTo(_this); }, this);
        this.svgObserver.observe(this.svgElement().node, { attributes: true, subtree: true });
        this.svgElement().node.addEventListener("mousewheel", function (ev) {
            if (ev.shiftKey) {
                _this.scale(add(_this.scale(), mul(new Vec2(1, 1), ev.wheelDelta * 0.02)));
            }
            else {
                _this.rot(_this.rot() + ev.wheelDelta * 0.1);
            }
            ev.preventDefault();
            ev.stopPropagation();
        });
        this.svgElement.valueHasMutated();
    };
    Thing.prototype.makeSvg = function (s) {
        return null;
    };
    return Thing;
}());
var Shape = (function (_super) {
    __extends(Shape, _super);
    function Shape(s) {
        return _super.call(this, s) || this;
    }
    Shape.prototype.intersect = function (ray, result) { return false; };
    return Shape;
}(Thing));
var Light = (function (_super) {
    __extends(Light, _super);
    function Light(pos, rad, s) {
        var _this = _super.call(this, s) || this;
        _this.setup();
        _this.pos(pos);
        _this.scale(new Vec2(rad, rad));
        return _this;
    }
    Light.prototype.intersect = function (ray, result) {
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
    Light.prototype.makeSvg = function (s) {
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
    };
    return Light;
}(Shape));
var Circle = (function (_super) {
    __extends(Circle, _super);
    function Circle(pos, rad, s) {
        var _this = _super.call(this, s) || this;
        _this.setup();
        _this.pos(pos);
        _this.scale(new Vec2(rad, rad));
        return _this;
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
        var _this = _super.call(this, s) || this;
        _this.setup();
        _this.pos(pos);
        _this.scale(size);
        return _this;
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
        var _this = _super.call(this, s) || this;
        _this.points = points;
        _this.setup();
        return _this;
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
        var _this = _super.call(this, s) || this;
        _this.setup();
        _this.pos(pos);
        _this.rot(rot);
        return _this;
    }
    Camera.prototype.forward = function () {
        return transformDir(new Vec2(1, 0), this.transform());
    };
    Camera.prototype.lookAt = function (target, pos) {
        if (!pos) {
            pos = this.pos();
        }
        else {
            this.pos(pos);
        }
        var dir = normalize(sub(target, pos));
        var angle = Snap.angle(1, 0, dir.x, dir.y);
        this.rot(angle);
    };
    Camera.prototype.makeSvg = function (s) {
        var g = s.group();
        var el = s.path("M 0,0 20,15 A 40,40 1 0,0 20,-15 Z");
        CAM_MATERIAL().apply(el);
        g.add(el);
        var line = s.line(0, 0, 26, 20);
        CAM_MATERIAL().apply(line);
        g.add(line);
        var line = s.line(0, 0, 26, -20);
        CAM_MATERIAL().apply(line);
        g.add(line);
        var circle = s.ellipse(19, 0, 2, 4);
        CAM_MATERIAL().apply(circle);
        g.add(circle);
        g.data("thing", this);
        return g;
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
        var _this = _super.call(this, s) || this;
        _this.data = data;
        _this.setup();
        return _this;
    }
    Path.prototype.makeSvg = function (s) {
        var posArray = [];
        var g = s.group();
        for (var _i = 0, _a = this.data.points; _i < _a.length; _i++) {
            var i = _a[_i];
            posArray.push(i.p.x, i.p.y);
            var normTarget = add(i.p, mul(i.n, 10));
        }
        var line = s.polyline(posArray);
        PATH_MATERIAL().apply(line);
        g.add(line);
        g.data("thing", this);
        g.attr({ "z-index": -1 });
        PATH_MATERIAL.subscribe(function (mat) { mat.apply(line); }, this);
        return g;
    };
    return Path;
}(Thing));
var Scene = (function (_super) {
    __extends(Scene, _super);
    function Scene(sampler, s) {
        var _this = _super.call(this, s) || this;
        _this.renderedPathsCount = ko.observable(0);
        _this.renderPathDensity = ko.observable(false);
        _this.sampler = sampler;
        _this.shapes = ko.observableArray([]);
        _this.paths = [];
        _this.cameras = ko.observableArray([]);
        _this.materials = ko.observableArray([]);
        _this.setup();
        $(_this.svgElement().node).off("mouswheel");
        s.undrag();
        sampleDirFunc.subscribe(function (newVal) { return _this.recalculatePaths(); }, _this);
        _this.svgElement.subscribe(function (newVal) { return _this.recalculatePaths(); }, _this);
        _this.renderPathDensity.subscribe(function (newVal) { return _this.recalculatePaths(); }, _this);
        return _this;
    }
    Scene.prototype.recalculatePaths = function () {
        var _this = this;
        for (var _i = 0, _a = this.paths; _i < _a.length; _i++) {
            var path = _a[_i];
            path.svgElement().remove();
        }
        this.paths = [];
        this.renderedPathsCount(0);
        this.canvas.clearRect(0, 0, 10000, 10000);
        if (this.renderPathDensity()) {
            window.requestAnimationFrame(function () { return _this.updateDensity(); });
        }
        else {
            for (var _b = 0, _c = this.cameras(); _b < _c.length; _b++) {
                var cam = _c[_b];
                var fwd = cam.forward();
                var startRay = new Ray(add(cam.pos(), mul(fwd, 21)), fwd);
                var newPaths = this.sampler.tracePath(startRay, 3, this);
                for (var _d = 0, newPaths_1 = newPaths; _d < newPaths_1.length; _d++) {
                    var p = newPaths_1[_d];
                    var path = new Path(p, this.paper);
                    this.paths.push(path);
                }
            }
        }
    };
    Scene.prototype.updateDensity = function () {
        var _this = this;
        if (!this.renderPathDensity())
            return;
        this.canvas.globalCompositeOperation = "soft-light";
        for (var _i = 0, _a = this.cameras(); _i < _a.length; _i++) {
            var cam = _a[_i];
            var fwd = cam.forward();
            var startRay = new Ray(add(cam.pos(), mul(fwd, 21)), fwd);
            var renderPaths = [];
            for (var i = 0; i < 10; i++) {
                var newPaths = this.sampler.tracePath(startRay, 6, this);
                for (var _b = 0, newPaths_2 = newPaths; _b < newPaths_2.length; _b++) {
                    var p = newPaths_2[_b];
                    renderPaths.push(p);
                }
            }
            this.renderedPathsCount(this.renderedPathsCount() + 10);
            this.canvas.strokeStyle = PATH_MATERIAL().outlineColor().hex;
            this.canvas.lineWidth = 0.4;
            this.canvas.globalAlpha = 0.02;
            for (var _c = 0, renderPaths_1 = renderPaths; _c < renderPaths_1.length; _c++) {
                var p = renderPaths_1[_c];
                this.canvas.beginPath();
                this.canvas.moveTo(p.points[0].p.x, p.points[0].p.y);
                for (var _d = 0, _e = p.points; _d < _e.length; _d++) {
                    var point = _e[_d];
                    this.canvas.lineTo(point.p.x, point.p.y);
                }
                this.canvas.stroke();
            }
        }
        if (this.renderedPathsCount() < 50000) {
            window.requestAnimationFrame(function () { return _this.updateDensity(); });
        }
    };
    Scene.prototype.addCamera = function (cam) {
        this.cameras.push(cam);
        this.svgElement().add(cam.svgElement());
        cam.svgElement().drag();
    };
    Scene.prototype.addShape = function (shape) {
        this.shapes.push(shape);
        this.svgElement().add(shape.svgElement());
        shape.svgElement().drag();
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
                    result.shape = shape;
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
        path.points.push({ p: ray.o, n: ray.d, shape: null });
        for (var i = 0; i < depth; i++) {
            var intersect = new Intersection();
            if (!scene.intersect(ray, intersect)) {
                path.points.push({ p: add(ray.o, mul(ray.d, 20000)), n: ray.d, shape: null });
                break;
            }
            path.points.push(intersect);
            if (intersect.shape instanceof Light) {
                break;
            }
            ray.o = intersect.p;
            ray.d = reflect(ray.d, intersect.n);
            ray.o = add(ray.o, mul(ray.d, 0.1));
        }
        return [path];
    };
    return SinglePathSampler;
}());
var sampleDirFunc = ko.observable();
var ScriptedPathSampler = (function () {
    function ScriptedPathSampler() {
    }
    ScriptedPathSampler.prototype.tracePath = function (ray, depth, scene) {
        if (depth < 0)
            return;
        var sampleDir = this.sampleDir();
        if (!sampleDir) {
            return [];
        }
        var path = new PathData();
        var result = [];
        result.push(path);
        path.points = [];
        path.points.push({ p: ray.o, n: ray.d, shape: null });
        var intersect = new Intersection();
        if (!scene.intersect(ray, intersect)) {
            path.points.push({ p: add(ray.o, mul(ray.d, 20000)), n: ray.d, shape: null });
            return result;
        }
        path.points.push(intersect);
        if (intersect.shape instanceof Light) {
            return result;
        }
        try {
            var dirs = sampleDir(intersect, ray);
            for (var _i = 0, dirs_1 = dirs; _i < dirs_1.length; _i++) {
                var dir = dirs_1[_i];
                var r = {
                    o: add(intersect.p, mul(dir, 1)),
                    d: dir
                };
                var newPaths = this.tracePath(r, depth - 1, scene);
                for (var _a = 0, newPaths_3 = newPaths; _a < newPaths_3.length; _a++) {
                    var newPath = newPaths_3[_a];
                    result.push(newPath);
                }
            }
        }
        catch (runtimeError) {
            $("#code-footer").text(runtimeError.name + "-" + runtimeError.message);
            return result;
        }
        return result;
    };
    return ScriptedPathSampler;
}());
function makeRaySVG(s, r, length) {
    var target = add(r.o, mul(r.d, length));
    return s.line(r.o.x, r.o.y, target.x, target.y);
}
function toDataUrl(e, maxWidth, maxHeight) {
    var bb = e.getBBox();
    var x = Math.max(+bb.x.toFixed(3), 0);
    var y = Math.max(+bb.y.toFixed(3), 0);
    var svg = Snap.format('<svg version="1.2" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="{width}" height="{height}" viewBox="{x} {y} {width} {height}">{contents}</svg>', {
        x: x - 3,
        y: y - 3,
        width: Math.min(+bb.width.toFixed(3), maxWidth) + x + 3,
        height: Math.min(+bb.height.toFixed(3), maxHeight) + y + 3,
        contents: e.outerSVG()
    });
    return "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svg)));
}
var s;
window.onload = function () {
    s = Snap("#svg-container");
    var cam = new Camera(new Vec2(100, 100), 45, s);
    CAM_MATERIAL().applyTo(cam);
    var pathSampler = new ScriptedPathSampler();
    pathSampler.sampleDir = sampleDirFunc;
    var scene = new Scene(pathSampler, s);
    var canvas = document.getElementById("density");
    var svgEl = document.getElementById("svg-container");
    var width = $(svgEl).width();
    var height = $(svgEl).height();
    canvas.width = width;
    canvas.height = height;
    scene.canvas = canvas.getContext("2d");
    scene.addCamera(cam);
    scene.addShape(new Circle(new Vec2(250, 280), 50, s));
    scene.addShape(new Light(new Vec2(300, 200), 4, s));
    var deformedCircle = new Circle(new Vec2(250, 150), 30, s);
    deformedCircle.scale(new Vec2(30.0, 10.0));
    deformedCircle.rot(0);
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
    poly.scale(new Vec2(40, 40));
    scene.addShape(poly);
    ko.applyBindings(scene);
};
function saveSvg() {
    var svgEl = document.getElementById("svg-container");
    var width = $(svgEl).width();
    var height = $(svgEl).height();
    console.log(width);
    console.log(height);
    var saveButton = document.getElementById("save-button");
    saveButton.setAttribute("href", toDataUrl(s, width, height));
}
//# sourceMappingURL=app.js.map