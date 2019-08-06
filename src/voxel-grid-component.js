(function() {

    function buildGrid(size,x,y,ctx) {
        let color = new bg.Color(1,0,0.8,1);
        let plist = new bg.base.PolyList(ctx);
        let width = size * x;
        let height = size * y;
        let xOffset = width / 2;
        let yOffset = height / 2;

        let v = [];
        let n = [];
        let t = [];
        let c = [];
        let i = [];

        let lastIndex = 0;
        function addVertex(x0,y0,x1,y1) {
            v.push(x0); v.push(0); v.push(y0);
            n.push(0); n.push(0); n.push(1);
            t.push(0); t.push(0);
            c.push(color.r); c.push(color.g); c.push(color.b); c.push(color.a);
            v.push(x1); v.push(0); v.push(y1);
            n.push(0); n.push(0); n.push(1);
            t.push(0); t.push(0);
            c.push(color.r); c.push(color.g); c.push(color.b); c.push(color.a);
            i.push(lastIndex++); i.push(lastIndex++);
        }

        for (let i = 0; i<=y; ++i) {
            let vx1 = -xOffset;
            let vx2 = width - xOffset;
            let vy = (i * size) - yOffset;
            addVertex(vx1, vy, vx2, vy);
        }

        for (let i = 0; i<=x; ++i) {
            let vy1 = -yOffset;
            let vy2 = height - yOffset;
            let vx = (i * size) - xOffset;
            addVertex(vx,vy1,vx,vy2); 
        }

        plist.vertex = v;
        plist.normal = n;
        plist.texCoord0 = t;
        plist.color = c;
        plist.index = i;
        plist.drawMode = bg.base.DrawMode.LINES;
        plist.build();
        return plist;
    }

    function updateVoxels() {
        if (this.node) {
            this.node.children.forEach((child) => {
                let voxel = child.component("bg.scene.Voxel");
                let transform = child.transform;
                if (voxel && transform && voxel.isCompatible(this)) {
                    
                }
            })
        }
    }

    class VoxelGrid extends bg.scene.Component {
        isCompatible(voxel) {
            if (voxel instanceof bg.scene.Voxel) {
                return voxel.sideSize == this.gridSize;
            }
            else {
                return null;
            }
        }
        constructor(size = 0.2, x = 5, y = 5) {
            super();

            if (size<=0 || x<=0 || y<=0) {
                throw new Error("Voxel grid size can't be negative or zero");
            }

            this._size = size;
            this._x = x;
            this._y = y;
            this._gizmoPlist = null;
        }

        get gridSize() { return this._size; }
        set gridSize(s) {
            if (s<=0) {
                throw new Error("Voxel grid size can't be negative or zero");
            }
            this._size = s;
            if (this._gizmoPlist) {
                this._gizmoPlist.destroy();
                this._gizmoPlist = null;
            }
        }

        get x() { return this._x; }
        set x(x) {
            if (x<=0) {
                throw new Error("Voxel grid size can't be negative or zero");
            }
            this._x = x;
            if (this._gizmoPlist) {
                this._gizmoPlist.destroy();
                this._gizmoPlist = null;
            }
        }

        get y() { return this._y; }
        set y(y) {
            if (y<=0) {
                throw new Error("Voxel grid size can't be negative or zero");
            }
            this._y = y;
            if (this._gizmoPlist) {
                this._gizmoPlist.destroy();
                this._gizmoPlist = null;
            }
        }

        get size() {
            return new bg.Vector2(
                this.gridSize * this.x,
                this.gridSize * this.y
            );
        }

        clone() {
            return new bg.scene.VoxelGrid(this.gridSize, this.x, this.y);
        }

        displayGizmo(pipeline,matrixState) {
            if (!this._gizmoPlist) {
                this._gizmoPlist = buildGrid(this.gridSize,this.x,this.y,this.node.context);
            }
            matrixState.modelMatrixStack.push();
            pipeline.draw(this._gizmoPlist);
            matrixState.modelMatrixStack.pop();
        }

        // Direct rendering
        willDisplay(pipeline,matrixState,projectionMatrixStack) {
            updateVoxels.apply(this);
        }

        // Render queue
        willUpdate(modelMatrixStack,viewMatrixStack,projectionMatrixStack) {
            updateVoxels.apply(this);
        }

        serialize(componentData,promises,url) {
            super.serialize(componentData,promises,url);
            componentData.gridSize = this.gridSize;
            componentData.x = this.x;
            componentData.y = this.y;
        }

        deserialize(context,sceneData,url) {
            this.gridSize = sceneData.gridSize>=0 ? sceneData.gridSize : this.gridSize;
            this.x = sceneData.x>=0 ? sceneData.x : this.x;
            this.y = sceneData.y>=0 ? sceneDAta.y : this.y;
        }
    }

    bg.scene.registerComponent(bg.scene,VoxelGrid,"bg.scene.VoxelGrid");

})();