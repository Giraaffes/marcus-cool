const draggables = {};
let nextId = 0;

let clickedDraggable;
let draggableClickedX, draggableClickedY;
let draggableDragXOffset, draggableDragYOffset;
let draggingDraggable = false;

let draggingString = false;
let stringOrigDraggable;


function boardX(event) {
	return event.pageX / boardZoom;
}

function boardY(event) {
	return event.pageY / boardZoom;
}


function removeConnections(draggable) {
	for (let toId of draggable.conns) {
		let to = draggables[toId];
		to.conns = to.conns.filter(id => id != draggable.id);
	}
	draggable.conns = [];
	drawConns = drawConns.filter(conn => !conn.includes(draggable.id));
}


function createPin(draggable, color) {
	if (draggable.pinned) {
		draggable.pinElement.remove();
	} else {
		draggable.pinned = true;
		draggable.element.addClass("pinned");
	}

	draggable.pinElement = $("#preview-pin").clone()
		.show().attr("id", "").appendTo("#board");
	draggable.pinElement.find(".main-img")
		.attr("src", `img/pin_${pinColors[color]}.png`);
	draggable.pinColor = color;

	draggable.pinElement.css({
		"left": `calc(${draggable.x}px + ${draggable.element.outerWidth() / 2}px)`,
		"top": `calc(${draggable.y}px + 1rem)`
	});

	draggable.pinElement.on("mousedown", (e) => {
		e.stopPropagation();
		if (stringsToggled && e.button == 0) {
			draggingString = true;
			stringOrigDraggable = draggable;
			draggable.pinElement.addClass("dragging-from");
		}
	});

	draggable.pinElement.on("mouseup", (e) => {
		if (draggingString) {
			stringOrigDraggable.pinElement.removeClass("dragging-from");
			if (
				stringOrigDraggable != draggable &&
				!stringOrigDraggable.conns.includes(draggable.id)
			) {
				stringOrigDraggable.conns.push(draggable.id);
				draggable.conns.push(stringOrigDraggable.id);
				drawConns.push([stringOrigDraggable.id, draggable.id]);
			}
		}
	});

	draggable.pinElement.on("click", (e_) => {
		if (trashcanToggled && e_.button == 0) {
			removeConnections(draggable);
			updateCanvas(e_);
			
			draggable.pinElement.remove();
			draggable.element.removeClass("pinned");
			draggable.pinned = false;
		}
	});
}

function createDraggable(id, type, element) {
	let draggable = {
		id: id,
		type: type,

		element: element,
		x: 0, y: 0, 

		pinned: false,
		pinColor: 0,
		pinElement: null,
		conns: [],

		content: type == "sticky" ? "" : null,
		//imageType: type == "image" ? "" : null,
		image: type == "image" ? "" : null,
		size: type == "image" ? 8 : null,
	};
	draggables[id] = draggable;

	draggable.element.on("mousedown", (e_) => {
		e_.stopPropagation();
		if (pinToggled || stringsToggled || trashcanToggled) {
			// Prevent sticky focusing or img being dragged
			e_.preventDefault();
			return;
		} else if (e_.button != 0 || draggable.element.is(":focus")) {
			return;
		}

		draggable.element.appendTo("#top-board");
		if (draggable.pinned) draggable.pinElement.appendTo("#top-board");
		draggable.element.css("caret-color", "transparent");

		clickedDraggable = draggable;
		draggableClickedX = e_.clientX;
		draggableClickedY = e_.clientY;
		draggableDragXOffset = `${boardX(e_) - draggable.x}px`;
		draggableDragYOffset = `${boardY(e_) - draggable.y}px`;
	});

	draggable.element.on("click", (e_) => {
		if (e_.button != 0) return;

		if (
			pinToggled && (
				!draggable.pinned || 
				draggable.pinColor != currentPinColor
			)
		) {
			draggable.element.removeClass("to-pin");

			createPin(draggable, currentPinColor);

			$("#preview-pin").hide();
		} else if (trashcanToggled) {
			removeConnections(draggable);
			updateCanvas(e_);

			draggable.element.remove();
			if (draggable.pinned) draggable.pinElement.remove();
			delete draggables[draggable.id];
		}
	});

	draggable.element.on("mouseover", () => {
		if (
			pinToggled && (
				!draggable.pinned || 
				draggable.pinColor != currentPinColor
			)
		) {
			if (draggable.pinned) draggable.pinElement.css("opacity", 0);
			$("#preview-pin").show().css({
				"left": `calc(${draggable.x}px + ${draggable.element.outerWidth() / 2}px)`,
				"top": `calc(${draggable.y}px + 1rem)`
			});
			draggable.element.addClass("to-pin");
		}
	});

	draggable.element.on("mouseleave", (e_) => {
		if (draggingDraggable && e_.relatedTarget == $("html")[0]) {
			$("body").trigger("mouseup");
		} else if (pinToggled) {
			if (draggable.pinned) draggable.pinElement.css("opacity", 1);
			$("#preview-pin").hide();
			draggable.element.removeClass("to-pin");
		}
	});

	return draggable;
}

function createSticky(id, atMouse, mouseposEvent, beginDragging) {
	let stickyElement = $("<span contenteditable spellcheck=\"false\"></span>")
		.addClass(["draggable", "sticky"])
	if (beginDragging) {
		stickyElement.addClass("dragged").appendTo("#top-board");
	} else {
		stickyElement.appendTo("#board");
	}
	
	let draggable = createDraggable(id, "sticky", stickyElement);
	
	if (atMouse) {
		let halfWidth = `${stickyElement.outerWidth() / 2}px`;
		if (beginDragging) {
			clickedDraggable = draggable;
			draggingDraggable = true;
			draggableDragXOffset = halfWidth;
			draggableDragYOffset = "1rem";
			triggerWithCoords("body", "mousemove", mouseposEvent);
		} else {
			stickyElement.css({
				"left": `calc(${boardX(mouseposEvent)}px - ${halfWidth})`,
				"top": `calc(${boardY(mouseposEvent)}px - 1rem)`
			});
			let pos = boardPos(stickyElement);
			draggable.x = pos.x;
			draggable.y = pos.y;
		}
	}

	stickyElement.on("keyup", (e_) => {
		if (e_.key == "Escape") {
			stickyElement.trigger("blur");
		}
	});
	stickyElement.on("blur", (e_, stayOnTop) => {
		if (!stayOnTop) {
			stickyElement.appendTo("#board");
			if (draggable.pinned) draggable.pinElement.appendTo("#board");
		}
	});
	stickyElement.on("input", (e) => {
		if (stickyElement.html() == "") {
			stickyElement.html("<br>");
		}
		draggable.content = stickyElement.html();

		stickyElement.css("padding", "0 0.5rem");
		let height = stickyElement.height();
		stickyElement.css("padding", 
			`max(${stickyVPadding}, (${minStickyHeight} - ${height}px) / 2) 0.5rem`
		);
	});

	stickyElement.trigger("input");
	stickyElement.on("mouseover", () => {
		if (trashcanToggled) stickyElement.trigger("input");
	}).on("mouseleave", () => {
		if (trashcanToggled) stickyElement.trigger("input");
	});

	return draggable;
}


function createChangeImgButton(draggable) {
	let image = draggable.element.find("img");

	let changeBtn = $("<button></button>").appendTo(draggable.element);
	changeBtn.on("mousemove", (e_) => {
		if (!changeBtn.is(":hover")) return;

		let size = changeBtn.outerWidth();
		let { left, top } = changeBtn.offset();
		let xPos = e_.pageX - left;
		let yPos = e_.pageY - top;
		if (xPos + yPos <= size) {
			changeBtn.addClass("hover");
		} else {
			changeBtn.removeClass("hover");
		}
	});
	changeBtn.on("mouseleave", () => {
		changeBtn.removeClass("hover");
	});

	changeBtn.on("mousedown", (e_) => {
		if (changeBtn.hasClass("hover")) e_.stopPropagation();
	});
	changeBtn.on("mouseup", async (e_) => {
		if (!changeBtn.is(".hover") || e_.button != 0) return;

		// fuckkk this doesn't work
		/*if (e_.button == 0) {
			$("#file-input").trigger("click").on("change", () => {
				let file = $("#file-input")[0].files[0];
				console.log($("#file-input")[0].files);
				let url = URL.createObjectURL(file);
				image.attr("src", url);

				draggable.imageType = "file";
				draggable.image = file.path;
			});
		} else if (e_.button == 2) {*/

		let url = prompt("File URL?");
		if (!url) return;
		let cutoffPos = url.search(/(?<=\.(png|gif|webp|jpg|jpeg|svg|avif))[\?\/]/);
		if (cutoffPos != -1) url = url.slice(0, cutoffPos);
		let proxyUrl = "https://corsproxy.io/?" + encodeURIComponent(url);

		let res = await fetch(proxyUrl);
		if (!res.ok) return;
		let blob = await res.blob();
		if (!blob.type.startsWith('image/')) return;
		image.attr("src", URL.createObjectURL(blob));

		//draggable.imageType = "url";
		draggable.image = url;

		//}

		//if ((e_.button == 0 || e_.button == 2) && draggable.pinned) {
		if (draggable.pinned) {
			image.on("load", () => {
				image.off("load");
				draggable.pinElement.css({
					"left": `calc(${draggable.x}px + ${draggable.element.outerWidth() / 2}px)`,
					"top": `calc(${draggable.y}px + 1rem)`
				});
				updateCanvas(e_);
			});
		}
	});
}

function createImage(id, atMouse, mouseposEvent, beginDragging, customUrl) {
	let imageElement = $("<div></div>")
		.addClass(["draggable", "image"]);
	if (beginDragging) {
		imageElement.addClass("dragged").appendTo("#top-board");
	} else {
		imageElement.appendTo("#board");
	}

	let draggable = createDraggable(id, "image", imageElement);

	imageElement.on("wheel", (e_) => {
		e_.preventDefault();
		if (clickedDraggable != draggable) return;

		let prevSize = draggable.size;
		let scrollDir = -Math.sign(e_.originalEvent.deltaY);
		draggable.size = constrain(draggable.size + scrollDir, 3, 20);
		image.css("height", `${draggable.size}rem`);

		draggableDragXOffset = `calc(${draggableDragXOffset} / ${prevSize} * ${draggable.size})`;
		draggableDragYOffset = `calc(${draggableDragYOffset} / ${prevSize} * ${draggable.size})`;
		triggerWithCoords("body", "mousemove", e_);
	});

	draggable.image = customUrl || "img/placeholder_image.png";
	let image = $(`<img src=\"${draggable.image}\">`).appendTo(imageElement);
	return new Promise((res, rej) => {
		image.on("load", () => {
			image.off("load");

			if (atMouse) {
				let halfWidth = `${imageElement.outerWidth() / 2}px`;
				if (beginDragging) {
					clickedDraggable = draggable;
					draggingDraggable = true;
					draggableDragXOffset = halfWidth;
					draggableDragYOffset = "1rem";
					triggerWithCoords("body", "mousemove", mouseposEvent);
				} else {
					imageElement.css({
						"left": `calc(${boardX(mouseposEvent)}px - ${halfWidth})`,
						"top": `calc(${boardY(mouseposEvent)}px - 1rem)`
					});
					let pos = boardPos(imageElement);
					draggable.x = pos.x;
					draggable.y = pos.y;
				}
			}

			createChangeImgButton(draggable);

			res(draggable);
		});
	});
}


$("body").on("mousemove", (e) => {
	if (clickedDraggable) {
		if (draggingDraggable) {
			window.getSelection().removeAllRanges();

			let left = `calc(${boardX(e)}px - ${draggableDragXOffset})`;
			let top = `calc(${boardY(e)}px - ${draggableDragYOffset})`;
			clickedDraggable.element.css({left, top});
			
			if (clickedDraggable.pinned) {
				clickedDraggable.pinElement.css({
					"left": `calc(${left} + ${clickedDraggable.element.outerWidth() / 2}px)`,
					"top": `calc(${top} + 1rem)`
				});
			}
		} else {
			let distDraggedSq = 
				Math.pow(e.clientX - draggableClickedX, 2) + 
				Math.pow(e.clientY - draggableClickedY, 2);
			if (distDraggedSq >= dragThresholdSq) {
				clickedDraggable.element.addClass("dragged");
				clickedDraggable.element.trigger("blur", [true]);
				draggingDraggable = true;
			}
		}
	}
});

$("body").on("mouseup", (e) => {
	if (clickedDraggable) {
		if (!draggingDraggable && clickedDraggable.type == "sticky") {
			clickedDraggable.element.css("caret-color", "#000");
		} else {
			clickedDraggable.element.appendTo("#board");
			if (clickedDraggable.pinned) {
				clickedDraggable.pinElement.appendTo("#board");
			}

			if (draggingDraggable) {
				let pos = boardPos(clickedDraggable.element);
				clickedDraggable.x = pos.x;
				clickedDraggable.y = pos.y;
				clickedDraggable.element.removeClass("dragged");
				draggingDraggable = false;
			}
		}
		
		clickedDraggable = null;
	} else if (draggingString) {
		stringOrigDraggable.pinElement.removeClass("dragging-from");
		draggingString = false;
		updateCanvas(e);
	}
});
