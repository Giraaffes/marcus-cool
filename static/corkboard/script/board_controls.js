const board = $("#board");
const boardWidth = board.width();
const boardHeight = board.height();

let boardClicked = false;
let prevBoardX, prevBoardY;
let boardClickedX, boardClickedY;
let draggingBoard = false;

let boardZoom = 1;

let photoMode = false;


$(document).scrollLeft(boardWidth / 2 - $(window).width() / 2);
$(document).scrollTop(boardHeight / 2 - $(window).height() / 2);


board.on("mousedown", (e) => {
	if (e.button != 0) return;

	boardClicked = true;
	boardClickedX = e.clientX;
	boardClickedY = e.clientY;
	prevBoardX = $(document).scrollLeft();
	prevBoardY = $(document).scrollTop();

	$("#toolbar").css("pointer-events", "none");
});

board.on("mouseup", () => {
	boardClicked = false;
	draggingBoard = false;
	board.removeClass("dragged");

	$("#toolbar").css("pointer-events", "");
});

board.on("mousemove", (e) => {
	if (boardClicked) {
		let xDragged = e.clientX - boardClickedX;
		let yDragged = e.clientY - boardClickedY;

		if (draggingBoard) {
			$(document).scrollLeft(prevBoardX - xDragged);
			$(document).scrollTop(prevBoardY - yDragged);
		} else {
			let distDraggedSq = Math.pow(xDragged, 2) + Math.pow(yDragged, 2);
			if (distDraggedSq >= dragThresholdSq) {
				board.addClass("dragged");
				draggingBoard = true;
			}
		}
	}
});

$("#board, #top-board").on("wheel", (e) => {
	e.preventDefault();
	if ($("#top-board .image").length) return;

	let prevBoardZoom = boardZoom;
	let scrollDir = -Math.sign(e.originalEvent.deltaY);
	boardZoom = Math.min(boardZoom + scrollDir * zoomFactor, maxZoom);
	board.css("transform", `scale(${boardZoom})`);

	if (
		boardWidth * boardZoom < $(window).width() ||
		boardHeight * boardZoom < $(window).height()
	) {
		let wZoom = $(window).width() / boardWidth;
		let hZoom = $(window).height() / boardHeight;
		boardZoom = Math.max(wZoom, hZoom);
		board.css("transform", `scale(${boardZoom})`);
	} else {
		let scrollX = e.pageX / prevBoardZoom * boardZoom - e.pageX;
		let scrollY = e.pageY / prevBoardZoom * boardZoom - e.pageY;
		$(document).scrollLeft($(document).scrollLeft() + scrollX);
		$(document).scrollTop($(document).scrollTop() + scrollY);

		$("body").css("background-size", `calc(25rem * ${boardZoom})`);
	}

	$("#top-board").css("transform", `scale(${boardZoom})`);

	e.pageX = e.pageX / prevBoardZoom * boardZoom;
	e.pageY = e.pageY / prevBoardZoom * boardZoom;
	triggerWithCoords("body", "mousemove", e);
});

board.on("mouseleave", (e) => {
	if (e.relatedTarget == $("html")[0]) {
		board.trigger("mouseup");
	}
});

$("body").on("keydown", (e) => {
	if (e.key.toLowerCase() == "p") {
		photoMode = !photoMode;
		if (photoMode) {
			$("#go-back-bar, #toolbar").hide();
		} else {
			$("#go-back-bar, #toolbar").show();
		}
	}
});


function boardPos(element) {
	let offset = element.offset();
	return {
		x: offset.left / boardZoom,
		y: offset.top / boardZoom
	}
}