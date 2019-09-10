(function() {

    function getCubeGizmo(ctx,side,x,y,z,offset) {
        let cube = new bg.base.PolyList(ctx);
        let color = new bg.Color(0.7, 0.0, 1.0, 1.0);
        let xs = x * side;
        let ys = y * side;
        let zs = z * side;
        let vertex = [
             0 - offset.x,  0 - offset.y,  0 - offset.z, // 0
             0 - offset.x, ys - offset.y,  0 - offset.z, // 1
            xs - offset.x, ys - offset.y,  0 - offset.z, // 2
            xs - offset.x,  0 - offset.y,  0 - offset.z, // 3
             0 - offset.x,  0 - offset.y, zs - offset.z, // 4
             0 - offset.x, ys - offset.y, zs - offset.z, // 5
            xs - offset.x, ys - offset.y, zs - offset.z, // 6
            xs - offset.x,  0 - offset.y, zs - offset.z  // 7
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
        cube.vertex = vertex;
        cube.normal = normal;
        cube.texCoord0 = tc;
        cube.color = c;
        cube.index = index;
        cube.drawMode = bg.base.DrawMode.LINES;
        cube.build();

        return cube;
    }

    function setModified() {
        this._modified = true;
        if (this._gizmo) {
            this._gizmo.destroy();
            this._gizmo = null;
        }
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

            this._gizmo = null;

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

            // Offset of the drawable component respects the voxel
            this._offset = new bg.Vector3(0,0,0);
        }

        // If a model is loaded directly from a file, instead of being loaded from a
        // scene, it's important to regenerate the UUID before use it in the scene
        refreshUUID() {
            this._identifier = bg.utils.generateUUID();
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
            setModified.apply(this);
        }

        // voxel rotation
        get width() { return this._width; }
        set width(w) {
            if (w<=0) {
                throw new Error("Voxel size can't be negative or zero");
            }
            this._width = w;
            setModified.apply(this);
        }

        get height() { return this._height; }
        set height(h) {
            if (h<=0) {
                throw new Error("Voxel size can't be negative or zero");
            }
            this._height = h;
            setModified.apply(this);
        }

        get depth() { return this._depth; }
        set depth(d) {
            if (d<=0) {
                throw new Error("Voxel size can't be negative or zero");
            }
            this._depth = d;
            setModified.apply(this);
        }

        // The offset getter mark the voxel as modified because the
        // returned vector is mutable
        get offset() { setModified.apply(this); return this._offset; }
        set offset(o) { setModified.apply(this); this._offset = o; }

        get rotationX() { return this._rotationX; }
        set rotationX(r) { this._rotationX = Math.round(r) % 4; setModified.apply(this); }
        get rotationY() { return this._rotationY; }
        set rotationY(r) { this._rotationY = Math.round(r) % 4; setModified.apply(this); }
        get angleX() { return this._rotationX * Math.PI / 2; }
        get angleY() { return this._rotationY * Math.PI / 2; }

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
            if (!this._gizmo) {
                this._gizmo = getCubeGizmo(this.node.context, this._sideSize, this._width, this._height, this._depth, this._offset);
            }
            pipeline.draw(this._gizmo);
        }

        serialize(componentData,promises,url) {
            super.serialize(componentData,promises,url);
            componentData.identifier = this.identifier;
            componentData.sideSize = this.sideSize;
            componentData.width = this.width;
            componentData.height = this.height;
            componentData.depth = this.depth;
            componentData.rotationX = this.rotationX;
            componentData.rotationY = this.rotationY;
            componentData.offset = this.offset.toArray();
        }

        deserialize(context,sceneData,url) {
            // Side size, width, height and depth can only be positive, non-zero values
            this._identifier = sceneData.identifier || this._identifier;
            this.sideSize = sceneData.sideSize>=0 ? sceneData.sideSize : this.sideSize;
            this.width = sceneData.width>=0 ? sceneData.width : this.width;
            this.height = sceneData.height>=0 ? sceneData.height : this.height;
            this.depth = sceneData.depth>=0 ? sceneData.depth : this.depth;
            this.rotationX = sceneData.rotationX;
            this.rotationY = sceneData.rotationY;
            this.offset = new bg.Vector3(sceneData.offset);
        }
    }

    bg.scene.registerComponent(bg.scene,Voxel,"bg.scene.Voxel");

})();