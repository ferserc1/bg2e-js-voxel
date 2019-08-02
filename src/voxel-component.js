(function() {

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
    }

    bg.scene.registerComponent(bg.scene,Voxel,"bg.scene.Voxel");

})();