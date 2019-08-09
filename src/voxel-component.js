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
        static IsCompatible(v1,v2) {
            if (v1 instanceof Voxel) {
                return v1.isCompatible(v2);
            }
            else if (v2 instanceof Voxel) {
                return v2.isCompatible(v1);
            }
            else {
                return false;
            }
        }

        isCompatible(other) {
            if (other instanceof Voxel) {
                return other.sideSize == this.sideSize;
            }
            else if (other instanceof bg.scene.VoxelGrid) {
                return other.gridSize == this.sideSize;
            }
            else {
                return false;
            }
        }

        constructor(size = 0.2,width = 1,height = 1,depth = 1) {
            super();

            this._identifier = bg.utils.generateUUID();

            if (size<=0 || width<=0 || height<=0 || depth<=0) {
                throw new Error("Voxel size can't be negative or zero");
            }

            this._sideSize = size;
            this._width = width;
            this._height = height;
            this._depth = depth;

            // This allows to increase the rendering performance, avoiding to
            // update voxels if the data is not changed from the previous frame.
            // This property must be set to false only by the elements of the scene
            // that controls the voxel layout, such as a VoxelGrid
            this._modified = true;

            // Rotation: the rotation can be 0, 1, 2 or 3, in the X and Y axis, and
            // will be processed as:
            //      angle = π/2 * rotation
            this._rotationX = 0;
            this._rotationY = 0;
        }

        set modified(m) { this._modified = m; }
        get modified() { return this._modified; }

        // A voxel identifier is readonly, and is generated at the constructor, or
        // is deserialized from a file
        get identifier() { return this._identifier; }

        get sideSize() { return this._sideSize; }
        set sideSize(s) {
            if (s<=0) {
                throw new Error("Voxel size can't be negative or zero");
            }
            this._sideSize = s;
            this._modified = true;
        }

        // TODO: get and set width, height and depth depending on the
        // voxel rotation
        get width() { return this._width; }
        set width(w) {
            if (w<=0) {
                throw new Error("Voxel size can't be negative or zero");
            }
            this._width = w;
            this._modified = true;
        }

        get height() { return this._height; }
        set height(h) {
            if (h<=0) {
                throw new Error("Voxel size can't be negative or zero");
            }
            this._height = h;
            this._modified = true;
        }

        get depth() { return this._depth; }
        set depth(d) {
            if (d<=0) {
                throw new Error("Voxel size can't be negative or zero");
            }
            this._depth = d;
            this._modified = true;
        }

        // TODO: Voxel offsets. Displace the drawable object to align it with the voxel

        get rotationX() { return this._rotationX; }
        set rotationX(r) { this._rotationX = Math.round(r) % 4; }
        get rotationY() { return this._rotationY; }
        set rotationY(r) { this._rotationY = Math.round(r) % 4; }
        get angleX() { return this._rotationY * Math.PI / 2; }
        get angleY() { return this._rotaitonY * Math.PI / 2; }

        get size() {
            return new bg.Vector3(
                this._sideSize * this._width,
                this._sideSize * this._height,
                this._sideSize * this._depth);
        }

        clone() {
            return new bg.scene.Voxel(this.sideSize,  this.width, this.height, this.depth);
        }

        displayGizmo(pipeline,matrixState) {
            let pl = getCubeGizmo(this.node.context);
            matrixState.modelMatrixStack.push();
            matrixState.modelMatrixStack.scale(this._width, this._height, this._depth);
            pipeline.draw(pl);
            matrixState.modelMatrixStack.pop();
        }

        serialize(componentData,promises,url) {
            super.serialize(componentData,promises,url);
            componentData.identifier = this.identifier;
            componentData.sideSize = this.sideSize;
            componentData.width = this.width;
            componentData.height = this.height;
            componentData.depth = this.depth;
        }

        deserialize(context,sceneData,url) {
            // Side size, width, height and depth can only be positive, non-zero values
            this._identifier = sceneData.identifier || this._identifier;
            this.sideSize = sceneData.sideSize>=0 ? sceneData.sideSize : this.sideSize;
            this.width = sceneData.width>=0 ? sceneData.width : this.width;
            this.height = sceneData.height>=0 ? sceneData.height : this.height;
            this.depth = sceneData.depth>=0 ? sceneData.depth : this.depth;
        }
    }

    bg.scene.registerComponent(bg.scene,Voxel,"bg.scene.Voxel");

})();