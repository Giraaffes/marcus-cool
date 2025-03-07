// uuuhhhh i guess it breaks if 1rem != 16px
async function getBounds(draggable) {
	let bounds = {
		x: draggable.x / 16, y: draggable.y / 16
	};

	if (draggable.type == "sticky") {
		bounds.w = 10; bounds.h = 8;
	} else if (draggable.type == "image") {
		bounds.w = bounds.h = draggable.size;
		
		if (draggable.image) {
			let img = new Image();
			img.src = draggable.image;
			await img.decode();

			let whRatio = img.naturalWidth / img.naturalHeight;
			bounds.w *= whRatio;
		} else {
			bounds.w *= 1.5;
		}

		bounds.w += 1; bounds.h += 1;
	}

	return bounds
}

function getEdges(boardData, draggableBounds) {
	let draggableIds = Object.keys(boardData.draggables);

	let minX = 1000, minY = 1000;
	let maxX = -1000, maxY = -1000;
	for (let draggableId of draggableIds) {
		let bounds = draggableBounds[draggableId];
		minX = Math.min(minX, bounds.x);
		minY = Math.min(minY, bounds.y);
		maxX = Math.max(maxX, bounds.x + bounds.w);
		maxY = Math.max(maxY, bounds.y + bounds.h);
	}
	
	let ratio = (maxY - minY) / (maxX - minX);
	if (ratio > 0.8) {
		let scaleX = 1.25 * ratio;
		let centerX = (minX + maxX) / 2;
		minX = (minX - centerX) * scaleX + centerX;
		maxX = (maxX - centerX) * scaleX + centerX;
	} else if (ratio < 0.8) {
		let scaleY = 0.8 / ratio;
		let centerY = (minY + maxY) / 2;
		minY = (minY - centerY) * scaleY + centerY;
		maxY = (maxY - centerY) * scaleY + centerY;
	}

	return {minX, maxX, minY, maxY};
}

function drawDraggables(boardData, draggableBounds, minX, maxX, minY, maxY, ctx) {
	let draggableIds = Object.keys(boardData.draggables);
	for (let draggableId of draggableIds) {
		let draggable = boardData.draggables[draggableId];
		let bounds = draggableBounds[draggableId];

		ctx.fillStyle = draggable.type == "sticky" ? "#FFFF90" : "#FFFFFF";
		ctx.fillRect(
			map(bounds.x, minX, maxX, 0, 500),
			map(bounds.y, minY, maxY, 0, 400),
			bounds.w / (maxX - minX) * 500,
			bounds.h / (maxY - minY) * 400
		);
		if (draggable.type == "image") {
			ctx.fillStyle = "#DDDDDD";
			ctx.fillRect(
				map(bounds.x + 1, minX, maxX, 0, 500),
				map(bounds.y + 1, minY, maxY, 0, 400),
				(bounds.w - 2) / (maxX - minX) * 500,
				(bounds.h - 2) / (maxY - minY) * 400
			);
		}
	}
}

function drawStrings(boardData, draggableBounds, minX, maxX, minY, maxY, ctx) {
	let draggableIds = Object.keys(boardData.draggables);
	for (let draggableId of draggableIds) {
		let draggable = boardData.draggables[draggableId];
		if (draggable.pinned) {
			let bounds = draggableBounds[draggableId];
			let pinX = map(bounds.x + bounds.w / 2, minX, maxX, 0, 500);
			let pinY = map(bounds.y + 1, minY, maxY, 0, 400);

			for (let toId of draggable.conns) {
				let toBounds = draggableBounds[toId];
				let toPinX = map(toBounds.x + toBounds.w / 2, minX, maxX, 0, 500);
				let toPinY = map(toBounds.y + 1, minY, maxY, 0, 400);

				ctx.lineCap = "round";
				ctx.lineWidth = 3;
				ctx.strokeStyle = "#770000";
				ctx.beginPath();
				ctx.moveTo(pinX, pinY);
				ctx.lineTo(toPinX, toPinY);
				ctx.stroke();
			}
		}
	}
}

function drawPins(boardData, draggableBounds, minX, maxX, minY, maxY, ctx) {
	let draggableIds = Object.keys(boardData.draggables);
	for (let draggableId of draggableIds) {
		let draggable = boardData.draggables[draggableId];
		if (!draggable.pinned) continue;

		let bounds = draggableBounds[draggableId];
		let pinX = map(bounds.x + bounds.w / 2, minX, maxX, 0, 500);
		let pinY = map(bounds.y + 1, minY, maxY, 0, 400);

		ctx.fillStyle = pinColors[draggable.pinColor];
		ctx.beginPath();
		ctx.arc(
			pinX, pinY,
			0.75 / (maxX - minX) * 500,
			0, 2 * Math.PI
		);
		ctx.fill();
	}
}

async function createBoard(boardData) {
	let board = $("#board-template").clone().attr("id", "");
	board.find(".title").text(boardData.name || "[Untitled]");
	board.appendTo("#boards");

	board.find(".delete").on("click", (e) => {
		e.stopPropagation();
		let reallyDelete = confirm("Do you really wish to delete this board?");
		if (reallyDelete) {
			localStorage.removeItem(boardId);
			board.remove();
		}
	});

	let draggableIds = Object.keys(boardData.draggables);
	if (draggableIds.length == 0) return;

	let draggableBounds = [];
	for (let draggableId of draggableIds) {
		let draggable = boardData.draggables[draggableId];
		draggableBounds[draggableId] = await getBounds(draggable);
	}

	let {minX, maxX, minY, maxY} = getEdges(boardData, draggableBounds);
	minX -= 5; minY -= 4;
	maxX += 5; maxY += 4;

	let ctx = board.find("canvas")[0].getContext("2d");
	drawDraggables(boardData, draggableBounds, minX, maxX, minY, maxY, ctx);
	drawStrings(boardData, draggableBounds, minX, maxX, minY, maxY, ctx);
	drawPins(boardData, draggableBounds, minX, maxX, minY, maxY, ctx);

	let boardCenterX = (maxX + minX) / 2 * 16;
	let boardCenterY = (maxY + minY) / 2 * 16;
	board.on("click", () => {
		window.location.href = 
			`./edit.html?board=${boardData.id}&x=${boardCenterX}&y=${boardCenterY}`;
	});
}


let boards = { ...localStorage };
let boardIds = Object.keys(boards);
if (boardIds.length > 0) {
	for (let boardId of boardIds) {
		let boardData = JSON.parse(boards[boardId]);
		createBoard(boardData);
	}
} else {
	$("#boards").remove();
}