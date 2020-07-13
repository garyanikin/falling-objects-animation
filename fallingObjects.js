/**
* Анимация падающий объектов
* @param {svg_url[]} assets - ссылки на svg
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
  assets,
  gradients,
  {
    speed = [0.5, 3],
    move_angle = 45,
    initial_opacity = 0.7,
    min_count = 18,
    max_count = 40,
    object_width = 24,
    object_height = 24,
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
      render();
    },
    render,
    spawnObjects,
    stop: () => {
      IS_ANIMATED = false;
    },
  };

  function getRandomAsset() {
    return assets[Math.floor(assets.length * Math.random())];
  }

  function getContainerSize() {
    return {
      width: $CONTAINER.offsetWidth,
      height: $CONTAINER.offsetHeight,
    };
  }

  /**
   * Spawn from left side or from top side of container
   * return [x, y]
   */
  function getStartPosition() {
    const { width, height } = getContainerSize();
    const minX = -object_width;
    const minY = -object_height;

    const randomPosition = Math.floor(Math.random() * (height + width));

    if (randomPosition < height) {
      return [minX, randomPosition];
    } else {
      return [randomPosition - height, minY];
    }
  }

  // Randomly spawn objects from min_count to max_count
  async function spawnObjects() {
    const isSpawned = (chance) => Math.random() > 1 - chance; // object spawn chance
    const spawn = async () => {
      const object_url = getRandomAsset();
      const [x, y] = getStartPosition();
      const object = await createObject(object_url, x, y);
      OBJECTS.push(object);
    };
    if (OBJECTS.length < min_count && isSpawned(0.2)) {
      spawn();
    }

    // From min_count to max_count chance for spawn / 2
    if (OBJECTS.length < max_count && isSpawned(0.05)) {
      spawn();
    }
  }

  async function render() {
    if (OBJECTS.length) {
      OBJECTS.forEach((object) => object.update());
    }
    spawnObjects();

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

  async function createObject(object_url, x, y) {
    const width = object_width,
      height = object_height;
    const fillColor = "black";
    // fetch svg from url
    const svg = await fetcObject(object_url);
    const parser = new DOMParser();
    const svgDoc = parser.parseFromString(svg, "image/svg+xml").documentElement;
    svgDoc.setAttribute("class", "object");
    // set size
    svgDoc.setAttribute("width", width);
    svgDoc.setAttribute("height", height);
    // set opacity
    svgDoc.style.opacity = initial_opacity;
    // set fill color
    svgDoc.style.fill = fillColor;
    // set position
    svgDoc.style.transform = `translate(${x}px, ${y}px)`;

    return {
      key: `${Date.now()}${Math.random()}`,
      getColor: function getColor() {
        // Get color by x, y. Linear gradient with angle
        return "black";
      },
      update: function update() {
        const easing = (t) => t * t;
        const { width, height } = getContainerSize();
        const { y, x, el, setPosition, remove, getColor } = this;

        // set opacity
        el.style.opacity =
          initial_opacity *
          (1 -
            easing(
              Math.max((y + object_height) / height, (x + object_width) / width)
            ));

        // set fill color
        el.style.fill = getColor.call(this);

        // set position
        setPosition.call(this);

        const transitionEnd = y > height || x > width;
        if (transitionEnd) {
          remove.call(this);
        }
      },
      setPosition: function setPosition() {
        this.x =
          this.x + this.step_size * Math.cos((move_angle * Math.PI) / 180);
        this.y =
          this.y + this.step_size * Math.sin((move_angle * Math.PI) / 180);
        this.el.style.transform = `translate3d(${this.x}px, ${this.y}px, 0)`;
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
      step_size: speed[0] + Math.random() * (speed[1] - speed[0]),
      fillColor,
      el: document.querySelector(".container").appendChild(svgDoc),
    };
  }
};
