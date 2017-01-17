/// <reference path="node_modules/@types/snapsvg/index.d.ts"/>
/// <reference path="node_modules/@types/knockout/index.d.ts"/>
/// <reference path="node_modules/@types/jquery/index.d.ts"/>
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var _this = this;
var COLOR_PRIMARY = ko.observable(Snap.getRGB("#2C3E50"));
var COLOR_SUCCESS = ko.observable(Snap.getRGB("#18BC9C"));
var COLOR_INFO = ko.observable(Snap.getRGB("#3498DB"));
var COLOR_WARNING = ko.observable(Snap.getRGB("#F39C12"));
var COLOR_DANGER = ko.observable(Snap.getRGB("#E74C3C"));
var BACKGROUND_COLOR = ko.observable(Snap.getRGB("rgb(200, 200, 200)"));
var CAM_BACKGROUND_COLOR = ko.observable(Snap.getRGB("rgb(255, 255, 255)"));
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
function sampleCircle(pos, rad) {
    var angle = Math.random() * 2 * Math.PI;
    var dir = new Vec2(Math.sin(angle), Math.cos(angle));
    return add(pos, mul(dir, rad));
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
    function Material(name, outlineColor, fillColor, outlineOpacity, fillOpacity, outlineWidth) {
        var _this = this;
        this.outlineColor = ko.observable(outlineColor);
        this.fillColor = ko.observable(fillColor);
        ;
        this.outlineOpacity = outlineOpacity;
        this.fillOpacity = fillOpacity;
        this.outlineWidth = outlineWidth;
        this.linkedElements = ko.observableArray([]);
        this.isLight = ko.observable(false);
        this.name = ko.observable(name);
        this.outlineColor.subscribe(function (newValue) { _this.update(); }, this);
        this.fillColor.subscribe(function (newValue) { _this.update(); }, this);
    }
    Material.prototype.update = function () {
        for (var _i = 0, _a = this.linkedElements(); _i < _a.length; _i++) {
            var el = _a[_i];
            el.attr({
                fill: this.fillOpacity > 0.01 ? this.fillColor().hex : "none",
                stroke: this.outlineColor().hex,
                strokeWidth: this.outlineWidth / (el.transform().localMatrix ? el.transform().localMatrix.split().scalex : 1),
                "fill-opacity": this.fillOpacity,
                "stroke-opacity": this.outlineOpacity,
            });
        }
    };
    Material.prototype.apply = function (el) {
        var elMat = el.mat;
        if (elMat != this) {
            if (elMat) {
                elMat.linkedElements.remove(el);
            }
            el.mat = this;
            this.linkedElements.push(el);
        }
        el.attr({
            fill: this.fillOpacity > 0.01 ? this.fillColor().hex : "none",
            stroke: this.outlineColor().hex,
            strokeWidth: this.outlineWidth / (el.transform().localMatrix ? el.transform().localMatrix.split().scalex : 1),
            "fill-opacity": this.fillOpacity,
            "stroke-opacity": this.outlineOpacity,
        });
        for (var _i = 0, _a = el.children(); _i < _a.length; _i++) {
            var child = _a[_i];
            this.apply(child);
        }
    };
    Material.prototype.applyTo = function (el) {
        this.apply(el.svgElement());
    };
    return Material;
}());
Material.MATERIAL_MAP = {};
var DEFAULT_MATERIAL = ko.observable(new Material("Default", COLOR_DANGER(), BACKGROUND_COLOR(), 1.0, 0.25, 2));
var CAM_MATERIAL = ko.observable(new Material("Camera", CAM_OUTLINE(), CAM_BACKGROUND_COLOR(), 1.0, 0.75, 2));
var PATH_MATERIAL = ko.observable(new Material("Path", COLOR_SUCCESS(), BACKGROUND_COLOR(), 1.0, 0.0, 2));
var LIGHT_MATERIAL = ko.observable(new Material("Light", COLOR_WARNING(), BACKGROUND_COLOR(), 1.0, 0.25, 0.5));
var Thing = (function () {
    function Thing(s) {
        var _this = this;
        this.paper = s;
        this.cachedTransform = Snap.matrix();
        this.svgObserver = new MutationObserver(function (recs, inst) {
            var transformMutated = false;
            for (var _i = 0, recs_1 = recs; _i < recs_1.length; _i++) {
                var rec = recs_1[_i];
                if (rec.attributeName == "transform") {
                    transformMutated = true;
                    break;
                }
            }
            if (transformMutated) {
                _this.svgElement.valueHasMutated();
            }
        });
        this.svgElement = ko.observable();
        this.material = ko.observable(DEFAULT_MATERIAL());
        this.transform = ko.computed({
            read: function () {
                if (!_this.svgElement())
                    return Snap.matrix();
                _this.cachedTransform = _this.svgElement().transform().globalMatrix;
                _this.cachedTransformInv = _this.cachedTransform.invert();
                return _this.cachedTransform;
            },
            write: function (val) {
                if (!_this.svgElement())
                    return;
                _this.cachedTransform = val;
                _this.cachedTransformInv = _this.cachedTransform.invert();
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
    Thing.prototype.destroySvg = function (el) {
        this.material().linkedElements.remove(el);
        for (var _i = 0, _a = el.children(); _i < _a.length; _i++) {
            var child = _a[_i];
            this.destroySvg(child);
        }
    };
    Thing.prototype.destroy = function () {
        this.destroySvg(this.svgElement());
        this.svgElement().remove();
    };
    Thing.prototype.setup = function () {
        var _this = this;
        this.svgElement(this.makeSvg(this.paper));
        this.material.subscribe(function (newValue) { newValue.applyTo(_this); }, this);
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
    Shape.prototype.sampleShape = function () {
        return this.pos();
    };
    return Shape;
}(Thing));
var Light = (function (_super) {
    __extends(Light, _super);
    function Light(pos, rad, s) {
        var _this = _super.call(this, s) || this;
        _this.setup();
        _this.pos(pos);
        _this.scale(new Vec2(rad, rad));
        _this.material(LIGHT_MATERIAL());
        return _this;
    }
    Light.prototype.intersect = function (ray, result) {
        ray = transformRay(ray, this.cachedTransformInv);
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
        result.p = transformPoint(result.p, this.cachedTransform);
        result.n = transformDir(result.n, this.cachedTransform);
        return true;
    };
    Light.prototype.makeSvg = function (s) {
        var g = s.group();
        var circle = s.circle(0, 0, 1);
        this.material().apply(circle);
        g.add(circle);
        var mat = Snap.matrix();
        var xAxis = new Vec2(1, 0);
        var count = 10;
        for (var i = 0; i < count; i++) {
            mat.rotate(360 / count);
            var angle = 360 / count * i;
            var p = mul(transformPoint(xAxis, mat), 5);
            var line = s.line(0, 0, p.x, p.y);
            this.material().apply(line);
            g.add(line);
        }
        this.material().apply(g);
        g.data("thing", this);
        return g;
    };
    Light.prototype.sampleShape = function () {
        return sampleCircle(this.pos(), this.scale().x);
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
        ray = transformRay(ray, this.cachedTransformInv);
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
        result.p = transformPoint(result.p, this.cachedTransform);
        result.n = transformDir(result.n, this.cachedTransform);
        return true;
    };
    Circle.prototype.makeSvg = function (s) {
        var el = s.circle(0, 0, 1);
        el.data("thing", this);
        return el;
    };
    Circle.prototype.sampleShape = function () {
        return sampleCircle(this.pos(), this.scale().x);
    };
    return Circle;
}(Shape));
var BOX_CORNERS = [
    new Vec2(0, 0),
    new Vec2(1, 0),
    new Vec2(1, 1),
    new Vec2(0, 1)
];
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
        if (!hitSomething)
            return false;
        result.p = transformPoint(result.p, this.cachedTransform);
        result.n = transformDir(result.n, this.cachedTransform);
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
        if (!hitSomething)
            return false;
        result.p = transformPoint(result.p, this.cachedTransform);
        result.n = transformDir(result.n, this.cachedTransform);
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
        _this.fov = ko.observable(60);
        _this.setup();
        _this.pos(pos);
        _this.rot(rot);
        _this.material(CAM_MATERIAL());
        return _this;
    }
    Camera.prototype.forward = function () {
        return this.sampleDir(0.5);
    };
    Camera.prototype.sampleDir = function (psp) {
        var mat = Snap.matrix();
        setRotation(mat, -this.fov() / 2 + this.fov() * psp);
        var dir = transformDir(new Vec2(1, 0), mat);
        return transformDir(dir, this.cachedTransform);
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
        var mat = Snap.matrix();
        mat.rotate(-this.fov() / 2);
        var dir = transformDir(new Vec2(1, 0), mat);
        var eyeRadDir = mul(dir, 25);
        var el = s.path("M 0,0 " + eyeRadDir.x + ", " + eyeRadDir.y + " A 40, 40 1 0, 1 " + eyeRadDir.x + ", " + -eyeRadDir.y + " Z");
        this.material().apply(el);
        g.add(el);
        dir = mul(dir, 32);
        {
            var line = s.line(0, 0, dir.x, dir.y);
            this.material().apply(line);
            g.add(line);
        }
        {
            var line = s.line(0, 0, dir.x, -dir.y);
            this.material().apply(line);
            g.add(line);
        }
        var circle = s.ellipse(19, 0, 2, 4);
        this.material().apply(circle);
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
        _this.material(PATH_MATERIAL());
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
        this.material().apply(line);
        g.add(line);
        g.data("thing", this);
        g.attr({ "z-index": -1 });
        return g;
    };
    return Path;
}(Thing));
function setRotation(mat, r) {
    var cosr = Math.cos(Snap.rad(r));
    var sinr = Math.sin(Snap.rad(r));
    mat.a = cosr;
    mat.b = sinr;
    mat.c = -sinr;
    mat.d = cosr;
}
var SampleSpaceVisualization = (function () {
    function SampleSpaceVisualization(canvas) {
        this.canvas = canvas;
        this.selectedCoordinates = ko.observable(new Vec2(0.5, 0.5));
    }
    SampleSpaceVisualization.prototype.getPath = function (scene, cam, coord) {
        var path = new PathData();
        path.points = [];
        path.properties = new Set();
        var dir = cam.sampleDir(coord.x);
        var primaryRay = {
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
        var secondaryRay = {
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
    };
    SampleSpaceVisualization.prototype.update = function (scene, cam) {
        var width = this.canvas.canvas.width;
        var height = this.canvas.canvas.width;
        var newDataObj = this.canvas.createImageData(width, height);
        var newData = newDataObj.data;
        var mat = Snap.matrix();
        for (var x = 0; x < width; x++) {
            var dir = cam.sampleDir(x / width);
            var primaryRay = {
                o: cam.pos(),
                d: dir
            };
            var primaryHit = new Intersection();
            var didHitPrimary = scene.intersect(primaryRay, primaryHit);
            for (var y = 0; y < height; y++) {
                var pixelIndex = (x + width * y) * 4;
                if (!didHitPrimary) {
                    newData[pixelIndex + 0] = 0;
                    newData[pixelIndex + 1] = 0;
                    newData[pixelIndex + 2] = 0;
                    newData[pixelIndex + 3] = 255;
                    continue;
                }
                var secondaryDir = primaryHit.n;
                setRotation(mat, -90 + 180 * y / height);
                secondaryDir = transformDir(secondaryDir, mat);
                var secondaryRay = {
                    o: add(primaryHit.p, mul(secondaryDir, 1)),
                    d: secondaryDir
                };
                var secondaryHit = new Intersection();
                var didHitSecondary = scene.intersect(secondaryRay, secondaryHit);
                var primHitCol = primaryHit.shape.material().outlineColor();
                if (!didHitSecondary) {
                    newData[pixelIndex + 0] = primHitCol.r;
                    newData[pixelIndex + 1] = primHitCol.g;
                    newData[pixelIndex + 2] = primHitCol.b;
                    newData[pixelIndex + 3] = 255;
                    continue;
                }
                var secHitCol = secondaryHit.shape.material().outlineColor();
                newData[pixelIndex + 0] = 255 * (secHitCol.r / 255 * primHitCol.r / 255);
                newData[pixelIndex + 1] = 255 * (secHitCol.g / 255 * primHitCol.g / 255);
                newData[pixelIndex + 2] = 255 * (secHitCol.b / 255 * primHitCol.b / 255);
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
    };
    return SampleSpaceVisualization;
}());
var Scene = (function (_super) {
    __extends(Scene, _super);
    function Scene(sampler, s) {
        var _this = _super.call(this, s) || this;
        _this.visualizePrimarySampleSpace = ko.observable(false);
        _this.renderedPathsCount = ko.observable(0);
        _this.renderPathDensity = ko.observable(false);
        _this.sampler = sampler;
        _this.shapes = ko.observableArray([]);
        _this.lights = ko.observableArray([]);
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
    Scene.prototype.afterAddMaterial = function (element, data) {
        console.log(data);
        var outlinePickEl = element[1].querySelector('#jscolor-outline');
        var outlinePicker = new jscolor(outlinePickEl, {
            valueElement: null,
            value: data.outlineColor().hex,
        });
        outlinePickEl.textContent = "";
        outlinePicker.onFineChange = function () { data.outlineColor(Snap.getRGB("#" + outlinePicker.toString())); };
        var fillPickEl = element[1].querySelector('#jscolor-fill');
        var fillPicker = new jscolor(fillPickEl, {
            valueElement: null,
            value: data.fillColor().hex,
        });
        fillPicker.onFineChange = function () { data.fillColor(Snap.getRGB("#" + fillPicker.toString())); };
        fillPickEl.textContent = "";
    };
    Scene.prototype.removeMaterial = function (mat) {
        this.materials.remove(mat);
    };
    Scene.prototype.sampleLight = function () {
        var lightIndex = Math.floor(this.lights().length * Math.random());
        var light = this.lights()[lightIndex];
        return light.sampleShape();
    };
    Scene.prototype.recalculatePaths = function () {
        var _this = this;
        for (var _i = 0, _a = this.paths; _i < _a.length; _i++) {
            var path = _a[_i];
            path.destroy();
        }
        this.paths = [];
        this.renderedPathsCount(0);
        this.canvas.clearRect(0, 0, 10000, 10000);
        if (this.renderPathDensity()) {
            window.requestAnimationFrame(function () { return _this.updateDensity(); });
        }
        else if (!this.visualizePrimarySampleSpace()) {
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
        if (this.visualizePrimarySampleSpace()) {
            this.sampleSpaceVis.update(this, this.cameras()[0]);
            var p = this.sampleSpaceVis.getPath(this, this.cameras()[0], this.sampleSpaceVis.selectedCoordinates());
            var path = new Path(p, this.paper);
            this.paths.push(path);
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
            for (var i = 0; i < 4; i++) {
                var newPaths = this.sampler.tracePath(startRay, 4, this);
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
                this.canvas.strokeStyle = p.properties.has("HitLight") ? COLOR_WARNING().hex : COLOR_INFO().hex;
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
    Scene.prototype.removeThing = function (thing) {
        if (thing instanceof Camera) {
            this.cameras.remove(thing);
        }
        else if (thing instanceof Shape) {
            this.shapes.remove(thing);
        }
        if (thing instanceof Light) {
            this.lights.remove(thing);
        }
        thing.svgElement().remove();
        this.recalculatePaths();
    };
    Scene.prototype.addCamera = function (cam) {
        this.cameras.push(cam);
        this.svgElement().add(cam.svgElement());
        cam.svgElement().drag();
    };
    Scene.prototype.addShape = function (shape) {
        this.shapes.push(shape);
        if (shape instanceof Light)
            this.lights.push(shape);
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
    Scene.prototype.test = function (a, b) {
        var r = {
            o: a, d: normalize(sub(b, a))
        };
        var res = new Intersection();
        if (!this.intersect(r, res)) {
            return false;
        }
        var dist = vlength(sub(res.p, b));
        if (dist > 2)
            return false;
        return true;
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
        path.properties = new Set();
        path.points.push({ p: ray.o, n: ray.d, shape: null });
        for (var i = 0; i < depth; i++) {
            var intersect = new Intersection();
            if (!scene.intersect(ray, intersect)) {
                path.points.push({ p: add(ray.o, mul(ray.d, 20000)), n: ray.d, shape: null });
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
    };
    return SinglePathSampler;
}());
var sampleDirFunc = ko.observable();
var ScriptedPathSampler = (function () {
    function ScriptedPathSampler() {
    }
    ScriptedPathSampler.prototype.tracePath = function (ray, depth, scene) {
        if (depth < 0)
            return [];
        var sampleDir = this.sampleDir();
        if (!sampleDir) {
            return [];
        }
        var path = new PathData();
        var result = [];
        result.push(path);
        path.properties = new Set();
        path.points = [];
        path.points.push({ p: ray.o, n: ray.d, shape: null });
        var intersect = new Intersection();
        if (!scene.intersect(ray, intersect)) {
            path.points.push({ p: add(ray.o, mul(ray.d, 20000)), n: ray.d, shape: null });
            return result;
        }
        path.points.push(intersect);
        if (intersect.shape instanceof Light) {
            path.properties.add("HitLight");
            return result;
        }
        var dirs;
        try {
            dirs = sampleDir(intersect, ray, scene);
        }
        catch (runtimeError) {
            $("#code-footer").text("Sample Error:" + runtimeError.name + "-" + runtimeError.message);
            return result;
        }
        if (!dirs) {
            return result;
        }
        for (var _i = 0, dirs_1 = dirs; _i < dirs_1.length; _i++) {
            var dir = dirs_1[_i];
            var r = {
                o: add(intersect.p, mul(dir, 1)),
                d: dir
            };
            var newPaths;
            try {
                newPaths = this.tracePath(r, depth - 1, scene);
            }
            catch (runtimeError) {
                $("#code-footer").text("Trace Path Error:" + runtimeError.name + "-" + runtimeError.message);
                return result;
            }
            for (var _a = 0, newPaths_3 = newPaths; _a < newPaths_3.length; _a++) {
                var newPath = newPaths_3[_a];
                newPath.properties.forEach(function (value, index, set) {
                    path.properties.add(value);
                }, this);
                result.push(newPath);
            }
        }
        return result;
    };
    return ScriptedPathSampler;
}());
function makeRaySVG(s, r, length) {
    var target = add(r.o, mul(r.d, length));
    return s.line(r.o.x, r.o.y, target.x, target.y);
}
var s;
var scene;
function toDataUrl(e, maxWidth, maxHeight) {
    var bb = e.getBBox();
    var x = Math.max(+bb.x.toFixed(3), 0) - 3;
    var y = Math.max(+bb.y.toFixed(3), 0) - 3;
    var w = Math.min(+bb.width.toFixed(3), maxWidth) + x + 3;
    var h = Math.min(+bb.height.toFixed(3), maxHeight) + y + 3;
    var img;
    if (scene.renderPathDensity()) {
        var canvas = document.getElementById("density");
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
window.onload = function () {
    s = Snap("#svg-container");
    var cam = new Camera(new Vec2(100, 100), 45, s);
    CAM_MATERIAL().applyTo(cam);
    var pathSampler = new ScriptedPathSampler();
    pathSampler.sampleDir = sampleDirFunc;
    scene = new Scene(pathSampler, s);
    scene.materials.push(DEFAULT_MATERIAL());
    scene.materials.push(CAM_MATERIAL());
    scene.materials.push(PATH_MATERIAL());
    scene.materials.push(LIGHT_MATERIAL());
    var canvas = document.getElementById("density");
    var svgEl = document.getElementById("svg-container");
    var width = $(svgEl).width();
    var height = $(svgEl).height();
    window.addEventListener("resize", function () {
        canvas.width = $(svgEl).width();
        canvas.height = $(svgEl).height();
        scene.recalculatePaths();
    }, true);
    var svgEl = document.getElementById("svg-container");
    var width = $(svgEl).width();
    var height = $(svgEl).height();
    canvas.width = width;
    canvas.height = height;
    scene.canvas = canvas.getContext("2d");
    var sampleCanvas = document.getElementById("sample-space");
    sampleCanvas.width = $(sampleCanvas).width() * 0.5;
    sampleCanvas.height = sampleCanvas.width;
    scene.sampleSpaceVis = new SampleSpaceVisualization(sampleCanvas.getContext("2d"));
    sampleCanvas.addEventListener("mousemove", function (e) {
        if (e.button == 0 && !e.shiftKey)
            return;
        var x = (e.pageX - sampleCanvas.offsetLeft) / sampleCanvas.offsetWidth;
        var y = (e.pageY - sampleCanvas.offsetTop) / sampleCanvas.offsetHeight;
        console.log(new Vec2(x, y));
        scene.sampleSpaceVis.selectedCoordinates(new Vec2(x, y));
        scene.recalculatePaths();
    }, _this);
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
    var saveButton = document.getElementById("save-button");
    saveButton.setAttribute("href", toDataUrl(s, width, height));
}
//# sourceMappingURL=app.js.map