/**
* Анимация падающий объектов
* @param {svg_url[]} objects - ссылки на svg
* @param {css_gradient[]} gradients - список градиентов
* @param {
		speed: [min, max] - диапазон скорости для движения объектов
		step_size: number - длина шага объекта
		move_angle: number - угол движения объекта
        initial_opacity: number - начальный opacity объектов
        min_count: number - минимальное количество объектов на анимации
        max_count: number - максимальное количество объектов на анимации
	} options - настройки
*/
const FallingObjects = async (
  objects,
  gradients,
  {
    speed = [1, 10],
    step_size = 1,
    move_angle = 45,
    initial_opacity = 1,
    min_count = 10,
    max_count = 50,
  }
) => {
  let IS_ANIMATED = false;
  let $CONTAINER = null;
  let OBJECTS = [];
  let renderloop = null; // store animation frame request

  return {
    animate: ($container) => {
      IS_ANIMATED = true;
      $CONTAINER = $container;
      this.render();
      // start animation
    },
    render,
    spawnObjects,
    stop: () => {
      IS_ANIMATED = false;
    },
  };

  // Randomly spawn objects from min_count to max_count
  function spawnObjects() {}

  function render() {
    if (OBJECTS.length) {
      OBJECTS.forEach((object) => object.update());
    }
    this.spawnObjects();

    // TODO stop render loop when animation out of the viewport and restart it when it's in viewport again
    if (IS_ANIMATED) renderloop = requestAnimationFrame(render);
  }

  function fetcObject(url) {
    return fetch(url)
      .then((r) => r.text())
      .then((text) => {
        return text;
      })
      .catch(console.error.bind(console));
  }

  async function addObject(name) {
    const object = await createObject(name, Math.floor(Math.random() * 1000));
    OBJECTS.push(object);
  }

  async function createObject(name, x) {
    const width = 24,
      height = 24;
    const y = -height;
    const fillColor = "black";
    // fetch svg from url
    const svg = await fetcObject(`/assets/${name}`);
    const parser = new DOMParser();
    const svgDoc = parser.parseFromString(svg, "image/svg+xml").documentElement;
    svgDoc.setAttribute("class", "object");
    // set size
    svgDoc.setAttribute("width", width);
    svgDoc.setAttribute("height", height);
    // set fill color
    svgDoc.style.fill = fillColor;
    // set position
    svgDoc.style.transform = `translate(${x}px, ${y}px)`;

    return {
      key: `${Date.now()}${Math.random()}`,
      update: function update() {
        const { x, y, setPosition, remove, container } = this;
        // set fill color
        // svgDoc.style.fill = fillColor;
        // set position
        const newY = y + 1;
        setPosition.call(this, x, newY);

        const transitionEnd = newY > container;
        if (transitionEnd) {
          remove.call(this);
        }
      },
      setPosition: function setPosition(x, y) {
        this.x = x;
        this.y = y;
        this.el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      },
      remove: function remove() {
        const { index, el, key } = this;

        requestAnimationFrame(() => {
          el.remove();
          // remove object from OBJECTS array
          OBJECTS = OBJECTS.filter((object) => object.key !== key);
        });
      },
      x,
      y,
      container: 700,
      fillColor,
      el: document.querySelector(".container").appendChild(svgDoc),
    };
  }
};
