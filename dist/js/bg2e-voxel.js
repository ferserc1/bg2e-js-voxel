(function() {

    class PlaneVoxelGizmo extends bg.manipulation.Gizmo {
		constructor(path,visible=true) {
			super(path,visible);
			this._plane = bg.Axis.Y;
			this._autoPlaneMode = true;
		}
		
		get plane() {
			return this._plane;
		}

		set plane(a) {
			this._plane = a;
		}

		get autoPlaneMode() {
			return this._autoPlaneMode;
		}

		set autoPlaneMode(m) {
			this._autoPlaneMode = m;
		}

		get planeAxis() {
			switch (Math.abs(this.plane)) {
			case bg.Axis.X:
				return new bg.Vector3(1,0,0);
			case bg.Axis.Y:
				return new bg.Vector3(0,1,0);
			case bg.Axis.Z:
				return new bg.Vector3(0,0,1);
			}
		}

		get gizmoTransform() {
			let result = bg.Matrix4.Identity();
			switch (this.plane) {
			case bg.Axis.X:
				return bg.Matrix4.Rotation(bg.Math.degreesToRadians(90),0,0,-1)
			case bg.Axis.Y:
				break;
			case bg.Axis.Z:
				return bg.Matrix4.Rotation(bg.Math.degreesToRadians(90),1,0,0);
			case -bg.Axis.X:
				return bg.Matrix4.Rotation(bg.Math.degreesToRadians(90),0,0,1)
			case -bg.Axis.Y:
				return bg.Matrix4.Rotation(bg.Math.degreesToRadians(180),0,-1,0);
			case -bg.Axis.Z:
				return bg.Matrix4.Rotation(bg.Math.degreesToRadians(90),-1,0,0);
			}
			return result;
		}

		clone() {
			let newGizmo = new PlaneGizmo(this._gizmoPath);
			newGizmo.offset.assign(this._offset);
			newGizmo.visible = this._visible;
			return newGizmo;
		}

		init() {
			super.init();
			this._gizmoP = bg.Matrix4.Translation(this.transform.matrix.position);
		}
		
		display(pipeline,matrixState) {
			if (!this._gizmoItems || !this.visible) return;
			if (this.autoPlaneMode) {
				calculateClosestPlane(this,matrixState);
			}
			if (!this._gizmoItems || !this.visible) return;
			let modelview = new bg.Matrix4(matrixState.viewMatrixStack.matrix);
			modelview.mult(matrixState.modelMatrixStack.matrix);
			let s = modelview.position.magnitude() / this._scale;
			s = s<this._minSize ? this._minSize : s;
			let gizmoTransform = this.gizmoTransform;
			gizmoTransform.setScale(s,s,s);
			matrixState.modelMatrixStack.push();
			matrixState.modelMatrixStack
				.mult(gizmoTransform);
			if (pipeline.effect instanceof bg.manipulation.ColorPickEffect &&
				(pipeline.opacityLayer & bg.base.OpacityLayer.GIZMOS ||
				pipeline.opacityLayer & bg.base.OpacityLayer.GIZMOS_SELECTION))
			{
				let dt = pipeline.depthTest;
				if (pipeline.opacityLayer & bg.base.OpacityLayer.GIZMOS_SELECTION) {	// drawing gizmos in selection mode
					pipeline.depthTest = true;
				}
				else {
					pipeline.depthTest = false;
				}
				this._gizmoItems.forEach((item) => {
					// The RGBA values are inverted because the alpha channel must be major than zero to
					// produce any output in the framebuffer
					if (item.plist.visible) {
						pipeline.effect.pickId = new bg.Color(item.id.a/255,item.id.b/255,item.id.g/255,item.id.r/255);
						pipeline.draw(item.plist);
					}
				});
				pipeline.depthTest = dt;
			}
			else if (pipeline.effect instanceof bg.manipulation.GizmoEffect) {
				// Draw gizmo
				this._gizmoItems.forEach((item) => {
					if (item.plist.visible) {
						pipeline.effect.texture = item.material.texture;
						pipeline.effect.color = item.material.diffuse;
						pipeline.draw(item.plist);
					}
				})
			}
			matrixState.modelMatrixStack.pop();
		}

		beginDrag(action,pos) {
			this._lastPickPoint = null;
		}
		
		drag(action,startPos,endPos,camera) {
            const CardinalPoint = {
                N: 0,
                NE: 1,
                E: 2,
                SE: 3,
                S: 4,
                SW: 5,
                W: 6,
                NW: 7
            };

            function cardinalPoint(direction) {
                if (direction.y>0.8) {
                    return CardinalPoint.N;
                } else if (direction.y<-0.8) {
                    return CardinalPoint.S
                } else if (direction.x>0.8) {
                    return CardinalPoint.W;
                } else if (direction.x<-0.8) {
                    return CardinalPoint.E;
                }

                return -1;
            }

            if (!this._lastPickPoint) {
                let plane = new bg.physics.Plane(this.planeAxis);
				let ray = bg.physics.Ray.RayWithScreenPoint(endPos,camera.projection,camera.viewMatrix,camera.viewport);
				let intersection = bg.physics.Intersection.RayToPlane(ray,plane);
                this._lastPickPoint = intersection.point;
            }

            let grid = this.node && this.node.parent && this.node.parent.component("bg.scene.VoxelGrid");
            let voxel = this.node && this.node.component("bg.scene.Voxel");
            let group = this.node && this.node.parent && this.node.parent.parent;

			if (this.transform && grid && voxel && grid.gridSize==voxel.sideSize && group) {
				let plane = new bg.physics.Plane(this.planeAxis);
				let ray = bg.physics.Ray.RayWithScreenPoint(endPos,camera.projection,camera.viewMatrix,camera.viewport);
                let intersection = bg.physics.Intersection.RayToPlane(ray,plane);
                let groupMatrix = group.transform && group.transform.matrix || bg.Matrix4.Identity();

				if (intersection.intersects()) {
					let matrix = new bg.Matrix4(this.transform.matrix);
                    this._gizmoP = bg.Matrix4.Translation(this.transform.matrix.position);
                    let groupRotation = groupMatrix.rotation;
                    groupRotation.invert();
                    
                    if (action == bg.manipulation.GizmoAction.TRANSLATE) {
                        let distance = this._lastPickPoint.distance(intersection.point);
                        let direction = new bg.Vector3(this._lastPickPoint);
                        direction.sub(intersection.point);
                        direction.normalize();
                        direction = groupRotation.multVector(direction).xyz;

                        if (distance>voxel.sideSize) {
                            let pos = grid._voxelPositions[voxel.identifier] || { x:0, y: 0 };
                            switch (cardinalPoint(new bg.Vector2(direction.x,direction.z))) {
                            case CardinalPoint.N:
                                pos.y--;
                                break;
                            case CardinalPoint.NE:
                                break;
                            case CardinalPoint.E:
                                pos.x++;
                                break;
                            case CardinalPoint.SE:
                                break;
                            case CardinalPoint.S:
                                pos.y++;
                                break;
                            case CardinalPoint.SW:
                                break;
                            case CardinalPoint.W:
                                pos.x--;
                                break;
                            case CardinalPoint.NW:
                                break;
                            }
                            this._lastPickPoint = intersection.point;
                            grid.setVoxelPosition(voxel,pos.x,pos.y);
                        }
                    }
                    else if (action == bg.manipulation.GizmoAction.ROTATE || action == bg.manipulation.GizmoAction.ROTATE_FINE) {
                        let distance = this._lastPickPoint.distance(intersection.point);
                        if (distance>0.2) {
                            voxel.rotationY = voxel.rotationY==3 ? 0 : voxel.rotationY + 1;
                            this._lastPickPoint = intersection.point;
                        }
                        else if (distance<-0.2) {
                            voxel.rotationY = voxel.rotationY==0 ? 3 : voxel.rotationY - 1;
                            this._lastPickPoint = intersection.point;
                        }
                    }
                    
					this.transform.matrix = matrix;
				}
			}
		}
		
		endDrag(action) {
			this._lastPickPoint = null;
		}
    }
    
    bg.manipulation.PlaneVoxelGizmo = PlaneVoxelGizmo;

})();
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
(function() {

    function buildGrid(size,x,y,offset,ctx) {
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
            v.push(x0 + offset.x); v.push(offset.y); v.push(y0 + offset.z);
            n.push(0); n.push(0); n.push(1);
            t.push(0); t.push(0);
            c.push(color.r); c.push(color.g); c.push(color.b); c.push(color.a);
            v.push(x1 + offset.x); v.push(offset.y); v.push(y1 + offset.z);
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
                let voxelId = voxel && voxel.identifier;
                let posData = voxelId && this._voxelPositions[voxelId] || { x:0, y: 0 };
                let transform = child.transform;
                if (voxel && transform && voxel.isCompatible(this) &&
                    (voxel.modified || posData.modified || this._modified))
                {
                    let offset = voxel.offset;
                    let rotY = voxel.angleY;
                    let x = offset.x;
                    let y = offset.y;
                    let z = offset.z;

                    switch (voxel.rotationY) {
                    case 0:
                        if (this.x%2!=0) x -= voxel.sideSize / 2;
                        if (this.y%2!=0) z -= voxel.sideSize / 2;
                        break;
                    case 1:
                        if (this.x%2==0) x -= voxel.sideSize / 2;
                        if (this.y%2==0) z += voxel.sideSize / 2;
                        break;
                    case 2:
                        if (this.x%2!=0) x += voxel.sideSize / 2;
                        if (this.y%2!=0) z += voxel.sideSize / 2;
                        break;
                    case 3:
                        if (this.x%2==0) x += voxel.sideSize / 2;
                        if (this.y%2==0) z -= voxel.sideSize / 2;
                        break;
                    }

                    x += posData.x * voxel.sideSize + this.offset.x;
                    z += posData.y * voxel.sideSize + this.offset.z;
                    y += this.offset.y;

                    // Update voxel transform
                    transform.matrix
                        .identity()
                        .rotate(rotY, 0, 1, 0);
                    transform.matrix.setPosition(x,y,z);

                    voxel.modified = false;
                    posData.modified = false;
                }
            });
            this._modified = false;
        }
    }

    // A voxel grid places the voxels in the XZ plane, and allows to build 2D compositions of voxels
    // It can handle rotations only in the Y axis
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

            this._modified = true;

            // Voxel positions
            this._voxelPositions = {};

            // Offset of the drawable component respects the voxel grid
            this._offset = new bg.Vector3(0,0,0);
        }

        setVoxelPosition(inVoxel,x,y) {
            let voxelId = "";
            if (typeof(inVoxel)=="string") {
                voxelId = inVoxel;
            }
            else if (inVoxel instanceof bg.scene.Voxel) {
                voxelId = inVoxel.identifier;
            }
            else if (inVoxel instanceof bg.scene.Node &&
                inVoxel.component("bg.scene.Voxel"))
            {
                voxelId = inVoxel.component("bg.scene.Voxel").identifier;
            }
            else {
                throw new Error("Invalid voxel or voxel identifier");
            }

            let positionData = this._voxelPositions[voxelId] || {};
            positionData.x = Math.round(x);
            positionData.y = Math.round(y);
            positionData.modified = true;
            this._voxelPositions[voxelId] = positionData;
        }

        getVoxelPosition(inVoxel) {
            let voxelId = "";
            if (typeof(inVoxel)=="string") {
                voxelId = inVoxel;
            }
            else if (inVoxel instanceof bg.scene.Voxel) {
                voxelId = inVoxel.identifier;
            }
            else if (inVoxel instanceof bg.scene.Node &&
                inVoxel.component("bg.scene.Voxel"))
            {
                voxelId = inVoxel.component("bg.scene.Voxel").identifier;
            }
            else {
                throw new Error("Invalid voxel or voxel identifier");
            }

            let positionData = this._voxelPositions[voxelId] || { x:0, y:0 };
            return new bg.Vector2(positionData.x, positionData.y);
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
            this._modified = true;
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
            this._modified = true;
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
            this._modified = true;
        }

        // The getter sets the modified property to true because the offset
        // vector is mutable
        get offset() { this._modified = true; return this._offset; }
        set offset(o) { this._modified = true; this._offset = o; }

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
                this._gizmoPlist = buildGrid(this.gridSize,this.x,this.y,this.offset,this.node.context);
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
            componentData.voxelPositions = this._voxelPositions;
            componentData.offset = this._offset.toArray();
        }

        deserialize(context,sceneData,url) {
            this.gridSize = sceneData.gridSize>=0 ? sceneData.gridSize : this.gridSize;
            this.x = sceneData.x>=0 ? sceneData.x : this.x;
            this.y = sceneData.y>=0 ? sceneData.y : this.y;
            this._voxelPositions = sceneData.voxelPositions || {};
            this._offset = new bg.Vector3(sceneData.offset);
        }
    }

    bg.scene.registerComponent(bg.scene,VoxelGrid,"bg.scene.VoxelGrid");

})();