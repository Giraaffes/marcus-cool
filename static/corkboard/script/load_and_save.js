let forcedStartPosition = false;

let saved = false;

let boardId;
let boardName;

async function setup() {	
	let params = new URLSearchParams(window.location.search);
	let xStart = params.get("x"); let yStart = params.get("y");
	if (xStart && yStart) {
		$(document)
			.scrollLeft(xStart - $(window).width() / 2)
			.scrollTop(yStart - $(window).height() / 2);
		let newUrl = window.location.href.match(/.+?board=\d+/)[0]
		history.replaceState({}, "", newUrl);
		forcedStartPosition = true;
	}

	boardId = params.get("board");
	if (boardId && localStorage.getItem(boardId)) {
		boardId = parseInt(boardId, 10);
		await load();

		saved = true;
		setInterval(save, 5 * 1000);
		window.addEventListener("beforeunload", save);
	} else {
		document.title = "Untitled board";
		window.addEventListener("beforeunload", (e) => 
			!saved && nextId > 0 && e.preventDefault()
		);
	}

	$("body").css("pointer-events", "");
}

async function load() {
	let data = JSON.parse(localStorage.getItem(boardId));
	boardName = data.name;
	document.title = `Board: ${boardName}`;

	if (!forcedStartPosition) {
		$(document)
		.scrollLeft(data.x - $(window).width() / 2)
		.scrollTop(data.y - $(window).height() / 2);
	}

	let draggableIds = Object.keys(data.draggables);
	draggableIds.sort((id1, id2) => 
		data.draggables[id1].index - data.draggables[id2].index
	);

	let maxId = -1;
	for (let draggableId of draggableIds) {
		let draggableData = data.draggables[draggableId];
		let numDraggableId = parseInt(draggableId, 10);

		let draggable;
		if (draggableData.type == "sticky") {
			draggable = createSticky(numDraggableId, false, null, false);
			draggable.element.html(draggableData.content);
			draggable.content = draggableData.content;
		} else if (draggableData.type == "image") {
			draggable = await createImage(numDraggableId, false, null, false, draggableData.image);
			draggable.element.find("img")
				.css("height", `${draggableData.size}rem`);
			draggable.size = draggableData.size;
		}

		draggable.element.css({
			"left": `${draggableData.x}px`,
			"top": `${draggableData.y}px`
		});
		draggable.x = draggableData.x;
		draggable.y = draggableData.y;

		if (draggableData.pinned) {
			createPin(draggable, draggableData.pinColor);
		}

		draggable.conns = draggableData.conns;
		for (let toId of draggable.conns) {
			let alreadyDrawn = drawConns.some(conn => 
				conn[0] == numDraggableId && conn[1] == toId ||
				conn[1] == numDraggableId && conn[0] == toId
			);
			if (!alreadyDrawn) {
				drawConns.push([numDraggableId, toId]);
			}
		}

		maxId = Math.max(maxId, numDraggableId);
	}
	nextId = maxId + 1;
	
	updateCanvas({pageX: 0, pageY: 0});
}

function save() {
	if (!saved) {
		boardName = prompt("Name?");
		if (!boardName) return;

		boardId = 0;
		while (localStorage.getItem(boardId.toString())) {
			boardId++;
		}
	}

	let draggableElements = $(".draggable");

	let toSerialize = {
		id: boardId,
		name: boardName, draggables: {},
		x: ($(document).scrollLeft() + $(window).width() / 2) / boardZoom,
		y: ($(document).scrollTop() + $(window).height() / 2) / boardZoom
	};
	for (let draggableId of Object.keys(draggables)) {
		let draggable = draggables[draggableId];
		toSerialize.draggables[draggableId] = {
			type: draggable.type,
			x: draggable.x, y: draggable.y,
			pinned: draggable.pinned,
			pinColor: draggable.pinColor,
			conns: draggable.conns,

			content: draggable.content,
			//imageType: draggable.imageType,
			image: draggable.image,
			size: draggable.size, // meaning image size - cba to change it

			index: draggableElements.index(draggable.element)
		};
	}
	
	localStorage.setItem(boardId, JSON.stringify(toSerialize));
	if (!saved) {
		saved = true;
		// https://stackoverflow.com/a/68460928
		window.location.href = 
			`${window.location.href.split("?")[0]}?board=${boardId}`;
	}
}


setup();
$("#save-btn").on("click", save);