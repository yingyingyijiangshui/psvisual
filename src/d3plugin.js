/**
 * Created by arno on 15-12-18.
 */

// ====================== 等高线图算法 ==================================
(function() {

    d3.geom.contour = function(grid, start) {
        var s = start || d3_geom_contourStart(grid), // starting point
            c = [],    // contour polygon
            x = s[0],  // current x position
            y = s[1],  // current y position
            dx = 0,    // next x direction
            dy = 0,    // next y direction
            pdx = NaN, // previous x direction
            pdy = NaN, // previous y direction
            i = 0;

        do {
            // determine marching squares index
            i = 0;
            if (grid(x-1, y-1)) i += 1;
            if (grid(x,   y-1)) i += 2;
            if (grid(x-1, y  )) i += 4;
            if (grid(x,   y  )) i += 8;

            // determine next direction
            if (i === 6) {
                dx = pdy === -1 ? -1 : 1;
                dy = 0;
            } else if (i === 9) {
                dx = 0;
                dy = pdx === 1 ? -1 : 1;
            } else {
                dx = d3_geom_contourDx[i];
                dy = d3_geom_contourDy[i];
            }

            // update contour polygon
            if (dx != pdx && dy != pdy) {
                c.push([x, y]);
                pdx = dx;
                pdy = dy;
            }

            x += dx;
            y += dy;
        } while (s[0] != x || s[1] != y);

        return c;
    };

// lookup tables for marching directions
    var d3_geom_contourDx = [1, 0, 1, 1,-1, 0,-1, 1,0, 0,0,0,-1, 0,-1,NaN],
        d3_geom_contourDy = [0,-1, 0, 0, 0,-1, 0, 0,1,-1,1,1, 0,-1, 0,NaN];

    function d3_geom_contourStart(grid) {
        var x = 0,
            y = 0;

        // search for a starting point; begin at origin
        // and proceed along outward-expanding diagonals
        while (true) {
            if (grid(x,y)) {
                return [x,y];
            }
            if (x === 0) {
                x = y + 1;
                y = 0;
            } else {
                x = x - 1;
                y = y + 1;
            }
        }
    }
})();

// ====================== 热点图算法 ==================================
(function() {

    d3.hexbin = function() {
        var width = 1,
            height = 1,
            r,
            x = d3_hexbinX,
            y = d3_hexbinY,
            dx,
            dy;

        function hexbin(points) {
            var binsById = {};

            points.forEach(function(point, i) {
                var py = y.call(hexbin, point, i) / dy, pj = Math.round(py),
                    px = x.call(hexbin, point, i) / dx - (pj & 1 ? .5 : 0), pi = Math.round(px),
                    py1 = py - pj;

                if (Math.abs(py1) * 3 > 1) {
                    var px1 = px - pi,
                        pi2 = pi + (px < pi ? -1 : 1) / 2,
                        pj2 = pj + (py < pj ? -1 : 1),
                        px2 = px - pi2,
                        py2 = py - pj2;
                    if (px1 * px1 + py1 * py1 > px2 * px2 + py2 * py2) pi = pi2 + (pj & 1 ? 1 : -1) / 2; pj = pj2;
                }

                var id = pi + "-" + pj, bin = binsById[id];
                if (bin) bin.push(point); else {
                    bin = binsById[id] = [point];
                    bin.i = pi;
                    bin.j = pj;
                    bin.x = (pi + (pj & 1 ? 1 / 2 : 0)) * dx;
                    bin.y = pj * dy;
                }
            });

            return d3.values(binsById);
        }

        function hexagon(radius) {
            var x0 = 0, y0 = 0;
            return d3_hexbinAngles.map(function(angle) {
                var x1 = Math.sin(angle) * radius,
                    y1 = -Math.cos(angle) * radius,
                    dx = x1 - x0,
                    dy = y1 - y0;
                x0 = x1; y0 = y1;
                return [dx, dy];
            });
        }

        hexbin.x = function(_) {
            if (!arguments.length) return x;
            x = _;
            return hexbin;
        };

        hexbin.y = function(_) {
            if (!arguments.length) return y;
            y = _;
            return hexbin;
        };

        hexbin.hexagon = function(radius) {
            if (arguments.length < 1) radius = r;
            return "m" + hexagon(radius).join("l") + "z";
        };

        hexbin.centers = function() {
            var centers = [];
            for (var y = 0, odd = false, j = 0; y < height + r; y += dy, odd = !odd, ++j) {
                for (var x = odd ? dx / 2 : 0, i = 0; x < width + dx / 2; x += dx, ++i) {
                    var center = [x, y];
                    center.i = i;
                    center.j = j;
                    centers.push(center);
                }
            }
            return centers;
        };

        hexbin.mesh = function() {
            var fragment = hexagon(r).slice(0, 4).join("l");
            return hexbin.centers().map(function(p) { return "M" + p + "m" + fragment; }).join("");
        };

        hexbin.size = function(_) {
            if (!arguments.length) return [width, height];
            width = +_[0]; height = +_[1];
            return hexbin;
        };

        hexbin.radius = function(_) {
            if (!arguments.length) return r;
            r = +_;
            dx = r * 2 * Math.sin(Math.PI / 3);
            dy = r * 1.5;
            return hexbin;
        };

        return hexbin.radius(1);
    };

    var d3_hexbinAngles = d3.range(0, 2 * Math.PI, Math.PI / 3),
        d3_hexbinX = function(d) { return d[0]; },
        d3_hexbinY = function(d) { return d[1]; };

})();
