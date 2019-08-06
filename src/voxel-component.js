(function() {

    let g_cube = null;
    function getCubeGizmo(ctx) {
        if (!g_cube) {
            let color = new bg.Color(0.7, 0.0, 1.0, 1.0);
            g_cube = new bg.base.PolyList(ctx);
            let vertex = [
                -0.5, -0.5, -0.5,   // 0
                -0.5,  0.5, -0.5,   // 1
                 0.5,  0.5, -0.5,   // 2
                 0.5, -0.5, -0.5,   // 3
                -0.5, -0.5,  0.5,   // 4
                -0.5,  0.5,  0.5,   // 5
                 0.5,  0.5,  0.5,   // 6
                 0.5, -0.5,  0.5    // 7
            ];
            let normal = [];
            let tc = [];
            let c = [];
            for (let i = 0; i<vertex.length; i+=3) {
                normal.push(0); normal.push(0); normal.push(1);
                tc.push(0); tc.push(0);
                c.push(color.r); c.push(color.g); c.push(color.b); c.push(color.a);
            }
            let index = [
                0, 1, 1, 2, 2, 3, 3, 0,     // Back
                4, 5, 5, 6, 6, 7, 7, 4,     // Front
                0, 4, 1, 5, 2, 6, 3, 7      // Connection front -> back
            ];
            g_cube.vertex = vertex;
            g_cube.normal = normal;
            g_cube.texCoord0 = tc;
            g_cube.color = c;
            g_cube.index = index;
            g_cube.drawMode = bg.base.DrawMode.LINES;
            g_cube.build();
        }
        return g_cube;
    }

    class Voxel extends bg.scene.Component {
        constructor(size = 0.2,width = 1,height = 1) {
            super();

            this._sideSize = size;
            this._width = width;
            this._height = height;
        }

        get sideSize() { return this._sideSize; }
        set sideSize(s) { this._sideSize = s; }

        get width() { return this._width; }
        set width(w) { this._width = w; }

        get height() { return this._height; }
        set height(h) { this._height = h; }

        get size() {
            return new bg.Vector2(
                this._sideSize * this._width,
                this._sideSize * this._height);
        }

        clone() {
            return new bg.scene.Voxel(this.sideSize,  this.width, this.height);
        }

        displayGizmo(pipeline,matrixState) {
            let pl = getCubeGizmo(this.node.context);
            matrixState.modelMatrixStack.push();
            pipeline.draw(pl);
            matrixState.modelMatrixStack.pop();
        }

        serialize(componentData,promises,url) {
            super.serialize(componentData,promises,url);
            componentData.sideSize = this.sideSize;
            componentData.width = this.width;
            componentData.height = this.height;
        }

        // TODO: deserialize
    }

    bg.scene.registerComponent(bg.scene,Voxel,"bg.scene.Voxel");

})();