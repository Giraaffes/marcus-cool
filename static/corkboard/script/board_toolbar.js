const pinColors = ["red", "orange", "yellow", "green", "cyan", "blue", "purple", "magenta"];

let pinToggled = false;
let currentPinColor = 0;

let trashcanToggled = false;
let stringsToggled = false;

$("#preview-pin").hide();


function anyToolPressed(e) {
	let t = $(e.target).attr("id");
	if (t != "pin-btn" && pinToggled) $("#pin-btn").trigger("click");
	if (t != "strings-btn" && stringsToggled) $("#strings-btn").trigger("click");
	if (t != "trash-btn" && trashcanToggled) $("#trash-btn").trigger("click");

	$("body").trigger("mouseup");
}

$("#sticky-btn, #img-btn").on("mousedown", anyToolPressed);
$("#pin-btn, #strings-btn, #trash-btn").on("click", anyToolPressed);


$("#pin-btn").on("click", () => {
	// this is fucked, i don't know
	// everything is alright as long as there are stickies present
	$(".sticky").trigger("input");

	$(".draggable").trigger("mouseleave");
	if (pinToggled) {
		$("#board").removeClass("pinning");
		$("#pin-btn").removeClass("toggled");
		pinToggled = false;
	} else {
		$("#board").addClass("pinning");
		$("#pin-btn").addClass("toggled");
		pinToggled = true;
	}
	$(".draggable:hover").trigger("mouseover");
});

$("#pin-btn").on("wheel", (e) => {
	e.preventDefault();

	let scrollDir = -Math.sign(e.originalEvent.deltaY);
	currentPinColor = mod(currentPinColor + scrollDir, pinColors.length);
	let pinImg = `img/pin_${pinColors[currentPinColor]}.png`;

	$("#pin-btn img").attr("src", pinImg);
	$("#preview-pin .main-img").attr("src", pinImg)
});

$("#trash-btn").on("click", () => {
	if (trashcanToggled) {
		$("#board").removeClass("deleting");
		$("#trash-btn").removeClass("toggled");
		trashcanToggled = false;
	} else {
		$("#board").addClass("deleting");
		$("#trash-btn").addClass("toggled");
		trashcanToggled = true;
	}

	$(".sticky").trigger("input");
});

$("#strings-btn").on("click", () => {
	if (stringsToggled) {
		$("#board").removeClass("stringing");
		$("#strings-btn").removeClass("toggled");
		stringsToggled = false;
	} else {
		$("#board").addClass("stringing");
		$("#strings-btn").addClass("toggled");
		stringsToggled = true;
	}
});


$("#sticky-btn").on("mousedown", (e) => {
	createSticky(nextId, true, e, true);
	nextId++;
});

$("#img-btn").on("mousedown", (e) => {
	createImage(nextId, true, e, true);
	nextId++;
});


let lastMousemove;
$("body").on("mousemove", (e, simulated) => {
	if (!simulated)	lastMousemove = e;
});

const buttons = $("#toolbar button");
$("body").on("keydown", (e) => {
	if (!lastMousemove || $(".draggable:focus").length) return;

	let num = parseInt(e.key, 10);
	if (!num) return;
	
	if (num == 1) {
		createSticky(nextId, true, lastMousemove, false);
        nextId++;
		anyToolPressed({});
	} else if (num == 2) {
		createImage(nextId, true, lastMousemove, false);
        nextId++;
		anyToolPressed({});5
	} else if (num >= 3 && num <= 5) {
		buttons.eq(num).trigger("click");
	}
});