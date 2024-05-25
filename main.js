function main() {
	let cvs = document.querySelector("#viewport-canvas");
	let glWindow = new GLWindow(cvs);

	if (!glWindow.ok()) return;

	let place = new Place(glWindow);
	place.initConnection();

	let gui = setupGUI(cvs, glWindow, place);
}

const setupGUI = (cvs, glWindow, place) => {
	let color = new Uint8Array([0, 0, 0]);
	let dragging = false;
	let touchID = 0;
	let touchScaling = false;
	let lastMovePos = { x: 0, y: 0 };
	let lastScalingDist = 0;
	let touchstartTime;

	const colorField = document.querySelector("#color-field");
	const colorSwatch = document.querySelector("#color-swatch");

	// Event Listeners
	document.addEventListener("keydown", (ev) => {
		switch (ev.keyCode) {
			case 189: // '-'
			case 173: // '_'
				ev.preventDefault();
				zoomOut(1.2);
				break;
			case 187: // '='
			case 61:  // '+'
				ev.preventDefault();
				zoomIn(1.2);
				break;
		}
	});

	window.addEventListener("wheel", (ev) => {
		let zoom = glWindow.getZoom();
		zoom = ev.deltaY > 0 ? zoom / 1.05 : zoom * 1.05;
		glWindow.setZoom(zoom);
		glWindow.draw();
	});

	document.querySelector("#zoom-in").addEventListener("click", () => zoomIn(1.2));
	document.querySelector("#zoom-out").addEventListener("click", () => zoomOut(1.2));

	window.addEventListener("resize", () => {
		glWindow.updateViewScale();
		glWindow.draw();
	});

	cvs.addEventListener("mousedown", (ev) => {
		switch (ev.button) {
			case 0:
				dragging = true;
				lastMovePos = { x: ev.clientX, y: ev.clientY };
				break;
			case 1:
				pickColor({ x: ev.clientX, y: ev.clientY });
				break;
			case 2:
				ev.ctrlKey ? pickColor({ x: ev.clientX, y: ev.clientY }) : drawPixel({ x: ev.clientX, y: ev.clientY }, color);
				break;
		}
	});

	document.addEventListener("mouseup", () => {
		dragging = false;
		document.body.style.cursor = "auto";
	});

	document.addEventListener("mousemove", (ev) => {
		if (dragging) {
			const movePos = { x: ev.clientX, y: ev.clientY };
			glWindow.move(movePos.x - lastMovePos.x, movePos.y - lastMovePos.y);
			glWindow.draw();
			document.body.style.cursor = "grab";
			lastMovePos = movePos;
		}
	});

	cvs.addEventListener("touchstart", (ev) => {
		touchID++;
		touchstartTime = new Date().getTime();
		lastMovePos = { x: ev.touches[0].clientX, y: ev.touches[0].clientY };
		if (ev.touches.length === 2) {
			touchScaling = true;
			lastScalingDist = null;
		}

		setTimeout(() => {
			if (touchID == touchID) {
				pickColor(lastMovePos);
				navigator.vibrate(200);
			}
		}, 350);
	});

	document.addEventListener("touchend", (ev) => {
		touchID++;
		const elapsed = new Date().getTime() - touchstartTime;
		if (elapsed < 100) {
			if (drawPixel(lastMovePos, color)) {
				navigator.vibrate(10);
			}
		}
		if (ev.touches.length === 0) {
			touchScaling = false;
		}
	});

	document.addEventListener("touchmove", (ev) => {
		touchID++;
		if (touchScaling) {
			const dist = Math.hypot(
				ev.touches[0].pageX - ev.touches[1].pageX,
				ev.touches[0].pageY - ev.touches[1].pageY
			);
			if (lastScalingDist !== null) {
				const delta = lastScalingDist - dist;
				delta < 0 ? zoomIn(1 + Math.abs(delta) * 0.003) : zoomOut(1 + Math.abs(delta) * 0.003);
			}
			lastScalingDist = dist;
		} else {
			const movePos = { x: ev.touches[0].clientX, y: ev.touches[0].clientY };
			glWindow.move(movePos.x - lastMovePos.x, movePos.y - lastMovePos.y);
			glWindow.draw();
			lastMovePos = movePos;
		}
	});

	cvs.addEventListener("contextmenu", () => false);

	colorField.addEventListener("change", (ev) => {
		let hex = colorField.value.replace(/[^A-Fa-f0-9]/g, "").toUpperCase().padEnd(6, '0');
		color[0] = parseInt(hex.substring(0, 2), 16);
		color[1] = parseInt(hex.substring(2, 4), 16);
		color[2] = parseInt(hex.substring(4, 6), 16);
		colorField.value = `#${hex}`;
		colorSwatch.style.backgroundColor = `#${hex}`;
	});

	// Helper Functions
	const pickColor = (pos) => {
		color = glWindow.getColor(glWindow.click(pos));
		const hex = color.reduce((acc, val) => acc + val.toString(16).padStart(2, '0'), '#');
		colorField.value = hex.toUpperCase();
		colorSwatch.style.backgroundColor = hex;
	};

	const drawPixel = (pos, color) => {
		pos = glWindow.click(pos);
		if (pos) {
			const oldColor = glWindow.getColor(pos);
			if (!oldColor.every((val, i) => val === color[i])) {
				place.setPixel(pos.x, pos.y, color);
				return true;
			}
		}
		return false;
	};

	const zoomIn = (factor) => {
		glWindow.setZoom(glWindow.getZoom() * factor);
		glWindow.draw();
	};

	const zoomOut = (factor) => {
		glWindow.setZoom(glWindow.getZoom() / factor);
		glWindow.draw();
	};
};
