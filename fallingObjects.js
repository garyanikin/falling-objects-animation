// Frame counter
// const frames = []
// const pushFrame = frame => frames.push(frame)
// const getFrames = () => {
//   // debugger;
//   return (frames.reduce((acc, frame) => { return acc + frame }, 0) / frames.length)
// }
// window.getFrames = getFrames;

/**
* Анимация падающих объектов 
* @param {svg_url[]} assets - ссылки на svg
* @param {css_gradient[]} gradients - список градиентов
* @param {
    delay: [min, max] number - скорость движения объекта (чем значение меньше, тем выше скорость движения)
    step_size: [min, max] number - длина шага объекта
		move_angle: number - угол движения объекта
    initial_opacity: float - opacity объекта в начале анимации
    end_opacity: float - opacity объекта в конце анимации
    opacity_step: float - сила "бленда" объектов с фоном // TODO rename to background_blend_step
    opacity_delay: float - скорость "бленда" объектов с фоном // TODO rename to background_blend_delay
    min_count: number - минимальное количество объектов на анимации
    max_count: number - максимальное количество объектов на анимации
    object_width: number - ширина объектов
    object_height: number - высота объектов
    timeout: number - через сколько милисекунд убирать "хвост" у объектов
    timeout_transition: number - продолжительность анимации исчезновения объектов (fade out)
    is_retina: boolean - включение режима Retina (DPI x2)
	} options - настройки
*/
const FallingObjects = async (
  assets,
  cssGradients,
  {
    delay = [1, 3],
    step_size = [10, 40],
    move_angle = 45,
    initial_opacity = 0.9,
    end_opacity = 0.6,
    opacity_step = 0.1,
    opacity_delay = 10,
    background_color = "white",
    min_count = 1,
    max_count = 5,
    object_width = "10vw",
    object_height = "10vw",
    is_retina = true,
  }
) => {
  // POLYFILLS
  var requestAnimationFrame =
    window.requestAnimationFrame ||
    window.mozRequestAnimationFrame ||
    window.webkitRequestAnimationFrame ||
    window.msRequestAnimationFrame;
  var cancelAnimationFrame =
    window.cancelAnimationFrame || window.mozCancelAnimationFrame;

  // VARIABLES
  var gradients = cssGradients.map((css) => parseGradient(css));
  let IS_ANIMATED = false;
  let $CONTAINER = null;
  var $CANVAS = null;
  var TICK = 0;
  let OBJECTS = [];
  var isResizing = false;
  // pause animation on resize
  var onResize = () => {
    pause();
    if (isResizing) clearTimeout(isResizing);
    isResizing = setTimeout(() => {
      const { width, height } = getContainerSize();
      resizeCanvas($CANVAS, { width, height, is_retina });

      isResizing = false;
      IS_ANIMATED = true;
      render();
    }, 400);
  };
  var renderloop = null; // store animation frame request

  return {
    animate: ($container) => {
      window.addEventListener("resize", throttle(onResize, 150));
      IS_ANIMATED = true;
      $CONTAINER = $container;

      // init canvas if there is no one
      if (!$CANVAS) {
        initCanvas($CONTAINER);
      }
      spawnObjects();
      render();

      // Disable animation when container not in viewport
      if (!!window.IntersectionObserver) {
        let observer = new IntersectionObserver(
          (entries) => {
            entries.forEach((entry) => {
              if (entry.intersectionRatio < 0.2) {
                pause();
              } else if (!IS_ANIMATED) {
                IS_ANIMATED = true;
                render();
              }
            });
          },
          { threshold: 0.2 }
        );
        observer.observe($CONTAINER);
      }
    },
    render,
    pause,
    spawnObjects,
    stop: () => {
      IS_ANIMATED = false;
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(renderloop);
    },
  };

  function opacityStep() {
    const DPI = is_retina ? 2 : 1;
    const ctx = $CANVAS.getContext("2d");
    ctx.fillStyle = chroma(background_color).alpha(opacity_step);
    ctx.fillRect(0, 0, $CANVAS.width / DPI, $CANVAS.height / DPI);
  }

  function resizeCanvas($canvas, { width, height, is_retina }) {
    const DPI = is_retina ? 2 : 1;
    // canvas x2 DPI for retina
    $canvas.width = width * DPI;
    $canvas.height = height * DPI;
    $canvas.style.width = width + "px";
    $canvas.style.height = height + "px";
    if (is_retina) {
      context.scale(2, 2);
    }
  }

  function createCanvas($container) {
    var canvas = document.createElement("canvas");

    const DPI = is_retina ? 2 : 1;
    const { width, height } = getContainerSize();
    // canvas x2 DPI for retina
    canvas.width = width * DPI;
    canvas.height = height * DPI;
    canvas.style.width = width + "px";
    canvas.style.height = height + "px";
    context = canvas.getContext("2d");
    context.fillStyle = chroma(background_color).alpha(opacity_step);
    if (is_retina) {
      context.scale(2, 2);
    }
    $CANVAS = $container.appendChild(canvas);
  }

  function initCanvas($container) {
    if (!$container.children.length) {
      createCanvas($container);
    } else {
      // Detect if there is canvas
    }
  }

  function pause() {
    IS_ANIMATED = false;
    cancelAnimationFrame(renderloop);
  }

  function getRandomAsset() {
    return assets[Math.floor(assets.length * Math.random())];
  }

  function getRandomGradient() {
    return gradients[Math.floor(gradients.length * Math.random())];
  }

  function getContainerSize() {
    return {
      width: $CONTAINER.offsetWidth,
      height: $CONTAINER.offsetHeight,
    };
  }

  function getObjectSize(size) {
    // If size is not a number
    if (isNaN(size)) {
      return convertVU(size); // convert viewport units to px
    }
    return size;
  }

  function convertVU(size) {
    var w =
      window.innerWidth ||
      document.documentElement.clientWidth ||
      document.body.clientWidth;
    var h =
      window.innerHeight ||
      document.documentElement.clientHeight ||
      document.body.clientheight;
    var units = { vw: w / 100, vh: h / 100 };

    if (size.substr(-2) === "vw") {
      return parseFloat(size) * units.vw;
    } else if (size.substr(-2) === "vh") {
      return parseFloat(size) * units.vh;
    }

    return 0;
  }

  // TODO многие объекты появляются вне вьюпорта
  /**
   * Spawn from left side or from top side of container
   * return [x, y]
   */
  function getStartPosition() {
    const { width, height } = getContainerSize();

    const randomPosition = Math.floor(Math.random() * (height + width));

    if (randomPosition < height) {
      return [
        0 - getObjectSize(object_width),
        randomPosition - getObjectSize(object_height),
      ];
    } else {
      return [
        randomPosition - height - getObjectSize(object_width),
        0 - getObjectSize(object_height),
      ];
    }
  }

  // Randomly spawn objects from min_count to max_count
  async function spawnObjects() {
    if (gradients.length === 0) {
      console.warn("Не загружено не одного градиента");
      return;
    }

    const isSpawned = (chance) => Math.random() > 1 - chance; // object spawn chance
    const spawn = async () => {
      const object_url = getRandomAsset();
      const gradient = getRandomGradient();
      const [x, y] = getStartPosition();
      const object = await createObject(object_url, gradient, x, y);
      OBJECTS.push(object);
    };
    if (OBJECTS.length < min_count && isSpawned(0.2)) {
      spawn();
    } else if (OBJECTS.length < max_count && isSpawned(0.05)) {
      // From min_count to max_count chance for spawn / 2
      spawn();
    }
  }

  async function render() {
    const blendObjects = () => {
      // Blend old objects with background
      if (TICK >= opacity_delay) {
        opacityStep();
        TICK = 0;
      } else {
        TICK++;
      }
    }

    if (!isResizing) {
      if (OBJECTS.length) {
        OBJECTS.forEach((object) => {
          blendObjects();
          object.update();
        });
      }
      spawnObjects();
    }

    // TODO stop render loop when animation out of the viewport and restart it when it's in viewport again
    if (IS_ANIMATED) renderloop = requestAnimationFrame(render);
  }

  function fetchObject(url) {
    return fetch(url)
      .then((r) => r.text())
      .then((text) => {
        return text;
      })
      .catch(console.error.bind(console));
  }

  async function createObject(object_url, gradient, x, y) {
    const width = getObjectSize(object_width),
      height = getObjectSize(object_height);
    const fillColor = "black";

    // fetch svg from url
    const svg = await fetchObject(object_url);

    // TODO Change to Canvas
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

    // Геометрия с прямоугольными треугольниками
    const container_size = getContainerSize();
    const triangle_to_bottom = (container_size.height - y) / Math.cos((move_angle * Math.PI) / 180)
    const triangle_to_right = (container_size.width - x) / Math.sin((move_angle * Math.PI) / 180)
    let end_pos;

    if (triangle_to_bottom > triangle_to_right) {
      end_pos = [x + triangle_to_bottom * Math.sin((move_angle * Math.PI) / 180), container_size.height]
    } else {
      end_pos = [container_size.width, y + triangle_to_right * Math.cos((move_angle * Math.PI) / 180)]
    }
    const getHypotenuse = (a, b) => Math.sqrt(Math.pow(a, 2) + Math.pow(b, 2));
    const duration = getHypotenuse(end_pos[0] - x, end_pos[1] - y);

    return {
      getCanvas: () => {
        return $CANVAS;
      },
      gradient,
      start_pos: [x, y],
      duration,
      end_pos,
      svg: svgDoc, // вместо того чтобы хранить SVGElement рендерить разметку svg с помощью текста getSvg(fill, opacity)
      key: `${Date.now()}${Math.random()}`,
      getProgress: function getProgress() {
        const { width, height } = getContainerSize();
        const getHypotenuse = (a, b) => Math.sqrt(Math.pow(a, 2) + Math.pow(b, 2));
        const { y, x, end_pos, duration } = this;
        const current = getHypotenuse(end_pos[0] - x, end_pos[1] - y);

        return (current / duration).toFixed(2)
      },
      getColor: function getColor() {
        const progress = this.getProgress.call(this) * 100;
        const gradient = this.gradient;

        let startColor, stopColor, colorProgress;

        if (progress <= 0) {
          return gradient[0].color;
        } else if (progress >= 100) {
          return gradient[gradient.length - 1].color;
        }

        gradient.every(function (color, index) {
          if (color.position >= progress) {
            const start = gradient[index - 1];
            const stop = color;
            colorProgress =
              (progress - start.position) / (stop.position - start.position);
            startColor = start.color;
            stopColor = stop.color;
            return false;
          }
          return true;
        });

        return chroma.scale([startColor, stopColor])(colorProgress).hex();
      },
      update: function update() {
        // Create variable to slow down object moving
        if (!this.tick) {
          this.tick = 0;
        }

        if (this.tick === this.delay) {
          const easing = (t) => t * t;
          const { svg, updatePosition, getColor, getProgress } = this;
          const progress = getProgress.call(this);

          if (progress > 1) {
            this.remove.call(this);
            return;
          }

          // set opacity
          svg.style.opacity =
            (initial_opacity - end_opacity) * (1 - easing(progress)) +
            end_opacity;

          // set fill color
          svg.style.fill = getColor.call(this);

          // set position
          const position = updatePosition.call(this);
          renderObject(this.getCanvas(), svg, position);

          this.tick = 0;
        }

        this.tick = this.tick + 1;
      },
      updatePosition: function updatePosition() {
        this.x =
          this.x + this.step_size * Math.cos((move_angle * Math.PI) / 180) * 2;
        this.y =
          this.y + this.step_size * Math.sin((move_angle * Math.PI) / 180) * 2;
        return { x: this.x, y: this.y };
      },
      remove: function remove() {
        const { key } = this;
        // remove object from OBJECTS array
        OBJECTS = OBJECTS.filter((object) => object.key !== key);
      },
      x,
      y,
      step_size: step_size[0] + Math.random() * (step_size[1] - step_size[0]),
      delay: Math.floor(delay[0] + Math.random() * (delay[1] - delay[0])),
      fillColor,
    };
  }
};

function renderObject(canvas, svg, { x, y }) {
  var ctx = canvas.getContext("2d");
  var image = new Image();
  image.onload = function () {
    ctx.drawImage(image, x, y);
  };

  image.src =
    "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg.outerHTML);
}

function parseGradient(cssGradient) {
  if (GradientParser) {
    const { colorStops } = GradientParser.parse(cssGradient)[0];

    return colorStops.map(({ value, length }) => ({
      color: `#${value}`,
      position: length.value,
    }));
  } else {
    console.warn("Подключите gradientParser.js");
    return [];
  }
}

function throttle(func, timeFrame) {
  var lastTime = 0;
  return function () {
    var now = new Date();
    if (now - lastTime >= timeFrame) {
      func();
      lastTime = now;
    }
  };
}
