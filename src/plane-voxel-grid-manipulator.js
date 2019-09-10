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