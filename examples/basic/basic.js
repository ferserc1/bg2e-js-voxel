
class GizmoWindowController extends bg.app.WindowController {

	buildGizmo() {
		//let gizmo = new bg.manipulation.PlaneGizmo("../data/floor_gizmo.vwglb",false);
		//gizmo.autoPlaneMode = true;
		//let gizmo = new bg.manipulation.UnifiedGizmo("../data/unified_gizmo.bg2");
		//let gizmo = new bg.manipulation.UnifiedGizmo("../data/translate_gizmo.bg2");
		//let gizmo = new bg.manipulation.UnifiedGizmo("../data/scale_gizmo.bg2");
		//let gizmo = new bg.manipulation.UnifiedGizmo("../data/rotate_gizmo.bg2");
		let gizmo = new bg.manipulation.MultiModeGizmo(
			"../data/unified_gizmo.bg2",
			"../data/translate_gizmo.bg2",
			"../data/rotate_gizmo.bg2",
			"../data/scale_gizmo.bg2"
		);
		//gizmo = new bg.manipulation.PlaneGizmo("../data/floor_gizmo.vwglb");
		gizmo.visible = false;
		return gizmo;
	}

	buildScene() {
		this._root = new bg.scene.Node(this.gl, "Root node");
		
		bg.base.Loader.RegisterPlugin(new bg.base.TextureLoaderPlugin());
		bg.base.Loader.RegisterPlugin(new bg.base.VWGLBLoaderPlugin());
		
		bg.base.Loader.Load(this.gl,"../data/test-shape.vwglb")
			.then((node) => {
				this._root.addChild(node);
				node.name = "Cube 1";
				node.addComponent(new bg.manipulation.Selectable());
				node.addComponent(new bg.scene.Transform());
				let v = new bg.scene.Voxel();
				v.sideSize = 1;	// 1 meter side
				v.width = 1;
				v.height = 1;
				node.addComponent(v);
				node.removeComponent("bg.scene.OutputChainJoint");
				node.removeComponent("bg.scene.InputChainJoint");
				
				let cube2 = bg.scene.Drawable.InstanceNode(node);
				cube2.name = "Cube 2";
				cube2.component("bg.scene.Transform").matrix.translate(2,0,0);
				cube2.addComponent(v.clone());
				this._root.addChild(cube2);
				cube2.removeComponent("bg.scene.OutputChainJoint");
				cube2.removeComponent("bg.scene.InputChainJoint");
				
				let cube3 = bg.scene.Drawable.InstanceNode(node);
				cube3.name = "Cube 3";
				cube3.addComponent(v.clone());
				cube3.component("bg.scene.Transform").matrix.translate(-2,0,0);
				this._root.addChild(cube3);
				cube3.removeComponent("bg.scene.OutputChainJoint");
				cube3.removeComponent("bg.scene.InputChainJoint");
				
				node.addComponent(this.buildGizmo());
				cube2.addComponent(this.buildGizmo());
				cube3.addComponent(this.buildGizmo());
				
				this.postRedisplay();	// Update the view manually, because in this sample the auto update is disabled
			})
			
			.catch(function(err) {
				alert(err.message);
			});
		
		let floor = new bg.scene.Node(this.gl,"Floor");
		floor.addComponent(bg.scene.PrimitiveFactory.Plane(this.gl,10,10));
		floor.component("bg.scene.Drawable").getMaterial(0).shininess = 50;
		floor.addComponent(new bg.scene.Transform(bg.Matrix4.Identity().translate(0,-0.5,0)));
		floor.addComponent(new bg.manipulation.Selectable());
		this._root.addChild(floor);
		
		let lightNode = new bg.scene.Node(this.gl,"Light");
		lightNode.addComponent(new bg.scene.Light(new bg.base.Light(this.gl)));	
		lightNode.addComponent(new bg.scene.Transform(bg.Matrix4.Identity()
												.rotate(bg.Math.degreesToRadians(30),0,1,0)
												.rotate(bg.Math.degreesToRadians(35),-1,0,0)));
		lightNode.addComponent(new bg.manipulation.Selectable());
		lightNode.addComponent(this.buildGizmo());

		this._root.addChild(lightNode);
		this._light = lightNode.component("bg.scene.Light");

		this._camera = new bg.scene.Camera();
		let cameraNode = new bg.scene.Node(this.gl, "Camera");
		cameraNode.addComponent(this._camera);			
		cameraNode.addComponent(new bg.scene.Transform());
		cameraNode.addComponent(new bg.manipulation.OrbitCameraController());
		this._root.addChild(cameraNode);

		this._selectionHighlight = new bg.manipulation.SelectionHighlight(this.gl);
		this._selectionHighlight.highlightColor = new bg.Color(1,0,1,1);
	}
    
	init() {
		bg.Engine.Set(new bg.webgl1.Engine(this.gl));
		
        this.buildScene();
		
		this._renderer = bg.render.Renderer.Create(this.gl,bg.render.RenderPath.DEFERRED);
		this._renderer.clearColor = bg.Color.White();
		this._renderer.settings.raytracer.clearColor = bg.Color.White();

		this._inputVisitor = new bg.scene.InputVisitor();
		this._mousePicker = new bg.manipulation.MousePicker(this.gl);
		this._gizmoManager = new bg.manipulation.GizmoManager(this.gl);
		this._gizmoManager.gizmoOpacity = 0.7;
		this._gizmoManager.loadGizmoIcons([
			{ type:'bg.scene.Camera', icon:'gizmo_icon_camera.png' },
			{ type:'bg.scene.Light', icon:'gizmo_icon_light_point.png' },
			{ type:'bg.scene.Transform', icon:'gizmo_icon_transform.png' },
			{ type:'bg.scene.Drawable', icon:'gizmo_icon_drawable.png' }
		],'../data/gizmos/');
		this._gizmoManager.gizmoIconScale = 2;
		this._gizmoManager.show3dGizmos = true;
	}
    
    frame(delta) { this._renderer.frame(this._root, delta); }
	
	display() {
		this._renderer.display(this._root, this._camera);
		this._gizmoManager.drawGizmos(this._root, this._camera);
		this._selectionHighlight.drawSelection(this._root, this._camera);
	}
	
	reshape(width,height) {
		this._camera.viewport = new bg.Viewport(0,0,width,height);
		this._camera.projection.perspective(60,this._camera.viewport.aspectRatio,0.1,100);
	}
	
	// Pass the input events to the scene
	keyUp(evt) {
		console.log(evt);
		let gizmo = this._currentNode && this._currentNode.component("bg.manipulation.Gizmo");
		if (gizmo) {
			if (evt.key=="Q") {
				gizmo.mode = bg.manipulation.GizmoMode.SELECT;
			}
			else if (evt.key=="W") {
				gizmo.mode = bg.manipulation.GizmoMode.TRANSLATE;
			}
			else if (evt.key=="E") {
				gizmo.mode = bg.manipulation.GizmoMode.ROTATE;
			}
			else if (evt.key=="R") {
				gizmo.mode = bg.manipulation.GizmoMode.SCALE;
			}
			else if (evt.key=="T") {
				gizmo.mode = bg.manipulation.GizmoMode.TRANSFORM;
			}
		}
	}

	mouseDown(evt) {
		this.initSelect(evt.x,evt.y);
		this._inputVisitor.mouseDown(this._root,evt);
	}
	
	mouseDrag(evt) {
		if (!this._gizmoManager.working) {
			this._inputVisitor.mouseDrag(this._root,evt);
		}
		else {
			this._gizmoManager.move(new bg.Vector2(evt.x,evt.y),this._camera);
		}
		
		this.postRedisplay();
	}
	
	mouseUp(evt) {
		this.endSelect(evt.x,evt.y);
	}
	
	initSelect(x,y) {
		this._downPosition = new bg.Vector2(x,y);
			
		let result = this._mousePicker.pick(this._root,this._camera,new bg.Vector2(x,y));
		if (result && result.type==bg.manipulation.SelectableType.GIZMO) {
			this._gizmoManager.startAction(result, new bg.Vector2(x,y));
		}
	
	}
	
	endSelect(x,y) {
		let upPosition = new bg.Vector2(x,y);
		// Ignore mouseUp if the user is dragging the mouse (with a little offset to avoid ignore accidental drag)
		if (!this._gizmoManager.working && Math.abs(this._downPosition.distance(upPosition))<3) {
			if (this._currentMat) {
				this._currentMat.selectMode = false;
			}
			if (this._currentNode && this._currentNode.component("bg.manipulation.Gizmo")) {
				this._currentNode.component("bg.manipulation.Gizmo").visible = false;
			}
			let result = this._mousePicker.pick(this._root,this._camera,new bg.Vector2(x,y));
			let out = document.getElementById("out");
			if (result && result.type==bg.manipulation.SelectableType.PLIST) {
				out.innerHTML = `Node: ${result.node.name}`;
				this._currentNode = result.node;
				if (this._currentNode && this._currentNode.component("bg.manipulation.Gizmo")) {
					this._currentNode.component("bg.manipulation.Gizmo").visible = true;
				}
				this._currentMat = result.material;
				this._currentMat.selectMode = true;
			}
			else if (result && result.type==bg.manipulation.SelectableType.GIZMO_ICON) {
				out.innerHTML = `Node: ${ result.node.name}`;
				this._currentNode = result.node;
				if (this._currentNode && this._currentNode.component("bg.manipulation.Gizmo")) {
					this._currentNode.component("bg.manipulation.Gizmo").visible = true;
				}
			}
			else {
				out.innerHTML = "";
				this._currentMat = null;
			}
		}
		this._gizmoManager.endAction();
		this.postRedisplay();
	}
	
	mouseWheel(evt) {
		this._inputVisitor.mouseWheel(this._root,evt);
		this.postRedisplay();
	}
	
	touchStart(evt) {
		this._lastTouch = [evt.touches[0].x, evt.touches[0].y];
		this.initSelect(evt.touches[0].x,evt.touches[0].y);
		this._inputVisitor.touchStart(this._root,evt);
	}
	
	touchMove(evt) {
		if (!this._gizmoManager.working) {
			this._lastTouch = [evt.touches[0].x, evt.touches[0].y];
			this._inputVisitor.touchMove(this._root,evt);
		}
		else {
			this._gizmoManager.move(new bg.Vector2(evt.touches[0].x, evt.touches[0].y),this._camera);
		}
		
		this.postRedisplay();
	}
	
	mouseMove(evt) { this._inputVisitor.mouseMove(this._root,evt); }
	mouseOut(evt) { this._inputVisitor.mouseOut(this._root,evt); }
	touchEnd(evt) {
		this.endSelect(this._lastTouch[0],this._lastTouch[1]);
		this._inputVisitor.touchEnd(this._root,evt);
	}
}

function load() {
	let controller = new GizmoWindowController();
	let mainLoop = bg.app.MainLoop.singleton;
	window.windowController = controller;
	
	mainLoop.updateMode = bg.app.FrameUpdate.MANUAL;
	mainLoop.canvas = document.getElementsByTagName('canvas')[0];
	mainLoop.run(controller);
}
