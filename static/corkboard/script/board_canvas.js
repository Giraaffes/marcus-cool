let canvas = $("#canvas");
let width = $("#board").width();
let height = $("#board").height();
canvas.attr("width", width);
canvas.attr("height", height);

let ctx = canvas[0].getContext("2d");
ctx.lineWidth = 4;
ctx.lineCap = "round";

let drawConns = [];
let deletableConnIndex;


function deleteConn(connIndex) {
	let conn = drawConns[connIndex];
	let draggable1 = draggables[conn[0]];
	draggable1.conns = draggable1.conns.filter(id => id != conn[1]);
	let draggable2 = draggables[conn[1]];
	draggable2.conns = draggable2.conns.filter(id => id != conn[0]);

	drawConns.splice(connIndex, 1);
}

function updateCanvas(e) {
	// check to fix corruption - who cares
	/*let toDelete = [];
	for (let connId in drawConns) {
		let conn = drawConns[connId];
		if (
			!draggables[conn[0]] ||
			!draggables[conn[1]] ||
			!draggables[conn[0]].pinElement ||
			!draggables[conn[1]].pinElement
		) {
			toDelete.push(connId);
		}
	}
	for (let connId of toDelete) {
		deleteConn(connId);
	}*/

	let mousePos = {
		x: e.pageX / boardZoom,
		y: e.pageY / boardZoom
	}

	ctx.clearRect(0, 0, width, height);

	if (draggingString) {
		let origPos = boardPos(stringOrigDraggable.pinElement);
		ctx.beginPath();
		ctx.moveTo(origPos.x, origPos.y);
		ctx.lineTo(mousePos.x, mousePos.y);
		ctx.strokeStyle = "#770000";
		ctx.stroke();
	}

	canvas.removeClass("can-delete");
	for (let connId in drawConns) {
		let stringConn = drawConns[connId];
		let coords1 = boardPos(draggables[stringConn[0]].pinElement);
		let coords2 = boardPos(draggables[stringConn[1]].pinElement);

		ctx.beginPath();
		ctx.moveTo(coords1.x, coords1.y);
		ctx.lineTo(coords2.x, coords2.y);

		ctx.strokeStyle = "#770000";
		if (trashcanToggled && !$(".pin .hover-area:hover").length) {
			let distToLineSq = distToSegmentSquared(mousePos, coords1, coords2);
			let halfLineSq = Math.pow(ctx.lineWidth / 2, 2);
			if (distToLineSq < (halfLineSq + 25)) {
				canvas.addClass("can-delete");
				deletableConnIndex = connId;
				ctx.strokeStyle = "#CC0000";
			}
		}
		ctx.stroke();
	}
}
// perhaps i should put it on a timer
$("body").on("mousemove", updateCanvas);

canvas.on("click", (e) => {
	deleteConn(deletableConnIndex);
	updateCanvas(e);
});


// https://stackoverflow.com/a/3368599
// don't know how this works and i don't care
function sqr(x) { return x * x }
function dist2(v, w) { return sqr(v.x - w.x) + sqr(v.y - w.y) }
function distToSegmentSquared(p, v, w) {
  var l2 = dist2(v, w);
  if (l2 == 0) return dist2(p, v);
  var t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
  t = Math.max(0, Math.min(1, t));
  return dist2(p, { x: v.x + t * (w.x - v.x),
                    y: v.y + t * (w.y - v.y) });
}