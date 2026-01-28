<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from "vue";
// @ts-ignore
import Matter from "matter-js";
import type { Prize } from "../../types/gacha";
import topImage from "../../assets/扭蛋机组装素材/扭蛋上半部分.png";
import bottomImage from "../../assets/扭蛋机组装素材/扭蛋下半部分.png";
import glassCoverImage from "../../assets/扭蛋机组装素材/玻璃罩.png";
import buttonImage from "../../assets/扭蛋机组装素材/抽奖按钮.png";
import gachaBall1 from "../../assets/扭蛋机组装素材/扭蛋素材/1.png";
import gachaBall2 from "../../assets/扭蛋机组装素材/扭蛋素材/2.png";
import gachaBall3 from "../../assets/扭蛋机组装素材/扭蛋素材/3.png";
import gachaBall4 from "../../assets/扭蛋机组装素材/扭蛋素材/4.png";
import InnerBall2 from "./InnerBall2.vue";
import GachaBall2 from "./GachaBall2.vue";
import OverlayMask2 from "./OverlayMask2.vue";

type MachineStatus = "idle" | "shaking" | "dropping" | "revealing" | "open";

const props = defineProps<{
  status?: MachineStatus;
  prize?: Prize | null;
  disabled?: boolean;
}>();

const emit = defineEmits<{
  (event: "start"): void;
  (event: "confirm"): void;
}>();

const { Engine, World, Bodies, Runner, Body, Events } = Matter;

const containerRef = ref<HTMLElement | null>(null);
const machineBodyRef = ref<HTMLElement | null>(null);
const exitGateRef = ref<HTMLElement | null>(null);
const isShaking = ref(false);
// 点击机身的“单次抖动”锁：动画未结束时再次点击无效
const isSingleShaking = ref(false);

// 存储当前随机选择的扭蛋索引（0-3），在 dropping 阶段生成
const currentBallIndex = ref<number>(0);

// 出奖口扭蛋落地静止时的旋转角（用于弹窗扭蛋初始角度衔接）
const exitBallRestRotation = ref<number>(0);

const toMinRotationDeg = (deg: number) => {
  // 将角度折算为“等效的最小旋转角”（[-180, 180]），用于走最短旋转路径
  // 公式：((deg + 180) mod 360) - 180
  const v = ((deg + 180) % 360 + 360) % 360; // [0, 360)
  return v - 180; // (-180, 180]
};

const handleInnerBallRest = (payload: { rotation: number }) => {
  exitBallRestRotation.value = toMinRotationDeg(payload.rotation);
};

// 暴露 exitGateRef 给外部使用
defineExpose({ exitGateRef });

// 计算是否正在动画中
const isAnimating = computed(() => {
  return props.status !== undefined && props.status !== "idle";
});
let engine: Matter.Engine | null = null;
let canvas: HTMLCanvasElement | null = null;
let ctx: CanvasRenderingContext2D | null = null;
let runner: Matter.Runner | null = null;
let animationFrameId: number | null = null;
let throttledHandleResize: ((...args: any[]) => void) | null = null;
let shakeIntervalId: number | null = null;
let ballForceIntervalId: number | null = null;
let singleShakeTimeoutId: number | null = null;

// 扭蛋图片数组
const gachaBallImages = [gachaBall1, gachaBall2, gachaBall3, gachaBall4];

// 存储扭蛋数据（包含图片和物理体）
interface GachaBall {
  body: Matter.Body;
  image: HTMLImageElement;
  imageUrl: string;
}

const balls: GachaBall[] = [];

// 圆形边界参数（在onMounted中初始化）
let centerX = 0;
let centerY = 0;
let radius = 0;
let ballSize = 20;

// 扭蛋大小百分比（相对于容器直径的百分比）
const BALL_SIZE_PERCENT = 0.12; // 12%，可以根据需要调整

// 计算扭蛋大小的函数
const calculateBallSize = (containerWidth: number, containerHeight: number): number => {
  const containerDiameter = Math.min(containerWidth, containerHeight);
  return containerDiameter * BALL_SIZE_PERCENT;
};

// 节流函数
const throttle = <T extends (...args: any[]) => void>(
  func: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  let lastCall = 0;
  return (...args: Parameters<T>) => {
    const now = Date.now();
    if (now - lastCall >= delay) {
      lastCall = now;
      func(...args);
    }
  };
};

// 加载图片
const loadImage = (src: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
};

onMounted(async () => {
  if (!containerRef.value) return;

  const container = containerRef.value;
  const containerRect = container.getBoundingClientRect();
  const width = containerRect.width;
  const height = containerRect.height;

  // 根据容器大小计算扭蛋大小
  ballSize = calculateBallSize(width, height);

  // 创建引擎
  engine = Engine.create();
  engine.world.gravity.y = 0.5; // 设置重力

  // 创建canvas
  canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  canvas.style.width = "100%";
  canvas.style.height = "100%";
  canvas.style.position = "absolute";
  canvas.style.top = "0";
  canvas.style.left = "0";
  container.appendChild(canvas);

  ctx = canvas.getContext("2d");
  if (!ctx) return;

  // 创建圆形边界（模拟玻璃罩的圆形边界）
  centerX = width / 2;
  centerY = height / 2;
  radius = Math.min(width, height) / 2 - 10;

  // 创建更精确的圆形边界墙（增加段数以减少缝隙）
  const wallSegments = 64; // 增加到64段，使边界更平滑
  const walls: Matter.Body[] = [];
  const wallThickness = 8; // 增加墙的厚度
  const wallLength = (2 * Math.PI * radius) / wallSegments;

  for (let i = 0; i < wallSegments; i++) {
    const angle = (Math.PI * 2 * i) / wallSegments;
    const x = centerX + Math.cos(angle) * radius;
    const y = centerY + Math.sin(angle) * radius;
    // 创建垂直于半径方向的墙段
    const wall = Bodies.rectangle(x, y, wallThickness, wallLength, {
      isStatic: true,
      angle: angle + Math.PI / 2, // 垂直于半径方向
      chamfer: { radius: 0 }, // 移除圆角，确保紧密连接
    });
    walls.push(wall);
  }

  World.add(engine.world, walls);

  // 创建20个随机扭蛋

  // 预加载所有图片
  const imagePromises = gachaBallImages.map((url) => loadImage(url));
  const loadedImages = await Promise.all(imagePromises);

  // 确保初始扭蛋都在圆形边界内
  const ballRadius = ballSize / 2;
  const maxInitialDistance = radius - ballRadius - 5; // 留出更多边距用于初始位置

  for (let i = 0; i < 20; i++) {
    // 随机选择扭蛋图片
    const randomIndex = Math.floor(Math.random() * loadedImages.length);
    const randomImage = loadedImages[randomIndex];
    const randomImageUrl = gachaBallImages[randomIndex];

    // 在圆形边界内随机生成位置
    let x, y, distance;
    let attempts = 0;
    do {
      // 使用极坐标生成随机位置
      const angle = Math.random() * Math.PI * 2;
      const r = Math.random() * maxInitialDistance;
      x = centerX + Math.cos(angle) * r;
      y = centerY + Math.sin(angle) * r;
      distance = Math.sqrt(
        Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2)
      );
      attempts++;
    } while (distance > maxInitialDistance && attempts < 10); // 最多尝试10次

    // 创建圆形扭蛋物理体（符合物理规律）
    const ballBody = Bodies.circle(x, y, ballRadius, {
      restitution: 0.8, // 弹性（参考 PhysicsCanvas）
      friction: 0.005, // 摩擦（参考 PhysicsCanvas）
      frictionAir: 0.05, // 空气阻力（参考 PhysicsCanvas）
      density: 0.001,
    });

    balls.push({
      body: ballBody,
      image: randomImage,
      imageUrl: randomImageUrl,
    });
  }

  // 将所有扭蛋添加到世界
  World.add(
    engine.world,
    balls.map((ball) => ball.body)
  );

  // 运行引擎
  runner = Runner.create();
  Runner.run(runner, engine);

  // 速度上限（参考 PhysicsCanvas）
  Events.on(engine, 'beforeUpdate', () => {
    balls.forEach((ball) => {
      const speed = ball.body.speed;
      if (speed > 15) {
        Body.setVelocity(ball.body, {
          x: ball.body.velocity.x * (15 / speed),
          y: ball.body.velocity.y * (15 / speed),
        });
      }
    });
  });

  // 自定义渲染循环
  const render = () => {
    if (!ctx || !canvas) return;

    // 约束检查：确保所有扭蛋都在圆形边界内
    const ballRadius = ballSize / 2;
    const maxDistance = radius - ballRadius - 2; // 留出2px的安全边距

    balls.forEach((ball) => {
      const { body } = ball;
      const { x, y } = body.position;

      // 计算到圆心的距离
      const dx = x - centerX;
      const dy = y - centerY;
      const distance = Math.sqrt(dx * dx + dy * dy);

      // 如果扭蛋超出圆形边界，将其推回
      if (distance > maxDistance) {
        // 计算应该放置的位置（在边界内）
        const angle = Math.atan2(dy, dx);
        const newX = centerX + Math.cos(angle) * maxDistance;
        const newY = centerY + Math.sin(angle) * maxDistance;

        // 使用Matter.js的setPosition来更新位置，同时保持速度
        Matter.Body.setPosition(body, { x: newX, y: newY });

        // 减小速度，防止持续逃逸
        const velocity = body.velocity;
        Matter.Body.setVelocity(body, {
          x: velocity.x * 0.5,
          y: velocity.y * 0.5,
        });
      }
    });

    // 清空画布
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 设置圆形裁剪区域，确保视觉上扭蛋不会显示在圆形外
    ctx.save();
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.clip();

    // 绘制所有扭蛋
    balls.forEach((ball) => {
      if (!ctx) return;
      const { body, image } = ball;
      const { x, y } = body.position;
      const angle = body.angle;

      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);
      ctx.drawImage(
        image,
        -ballSize / 2,
        -ballSize / 2,
        ballSize,
        ballSize
      );
      ctx.restore();
    });

    ctx.restore(); // 恢复裁剪区域

    animationFrameId = requestAnimationFrame(render);
  };

  render();

  // 监听窗口大小变化
  const handleResize = () => {
    if (!container || !canvas) return;
    const rect = container.getBoundingClientRect();
    const newWidth = rect.width;
    const newHeight = rect.height;
    canvas.width = newWidth;
    canvas.height = newHeight;

    // 更新圆形边界参数
    centerX = newWidth / 2;
    centerY = newHeight / 2;
    radius = Math.min(newWidth, newHeight) / 2 - 10;

    // 更新扭蛋大小（基于新的容器大小）
    ballSize = calculateBallSize(newWidth, newHeight);

    if (ctx) {
      ctx = canvas.getContext("2d");
    }
  };

  // 使用节流优化性能（每200ms最多执行一次）
  throttledHandleResize = throttle(handleResize, 200);
  window.addEventListener("resize", throttledHandleResize);

  // 给机器主体添加点击事件监听（带防抖）
  // 使用 nextTick 确保 DOM 渲染完成
  await nextTick();
  if (machineBodyRef.value) {
    machineBodyRef.value.addEventListener("click", handleMachineBodyClick);
  }
});

onUnmounted(() => {
  if (animationFrameId !== null) {
    cancelAnimationFrame(animationFrameId);
  }
  if (shakeIntervalId !== null) {
    clearTimeout(shakeIntervalId);
    shakeIntervalId = null;
  }
  if (singleShakeTimeoutId !== null) {
    clearTimeout(singleShakeTimeoutId);
    singleShakeTimeoutId = null;
  }
  isSingleShaking.value = false;
  if (ballForceIntervalId !== null) {
    clearInterval(ballForceIntervalId);
    ballForceIntervalId = null;
  }
  if (runner) {
    Runner.stop(runner);
  }
  if (engine) {
    Engine.clear(engine);
  }
  if (canvas && canvas.parentNode) {
    canvas.parentNode.removeChild(canvas);
  }
  if (throttledHandleResize) {
    window.removeEventListener("resize", throttledHandleResize);
    throttledHandleResize = null;
  }
  if (machineBodyRef.value) {
    machineBodyRef.value.removeEventListener("click", handleMachineBodyClick);
  }
  balls.length = 0;
});

// 持续给扭蛋施加随机力（符合物理规律，参考 PhysicsCanvas）
const applyRandomForcesToBalls = () => {
  if (!isShaking.value || !engine) {
    if (ballForceIntervalId !== null) {
      clearInterval(ballForceIntervalId);
      ballForceIntervalId = null;
    }
    return;
  }

  balls.forEach((ball) => {
    // 施加随机方向的力，符合物理规律
    // 参考 PhysicsCanvas：力的方向随机，但有一个向下的分量（符合重力）
    const angle = Math.random() * Math.PI * 2;
    const forceMagnitude = 0.035; // 力的大小（参考 PhysicsCanvas）
    Body.applyForce(ball.body, ball.body.position, {
      x: Math.cos(angle) * forceMagnitude,
      y: Math.sin(angle) * forceMagnitude - 0.005, // 向下的分量，符合重力
    });
  });
};

// 给所有扭蛋施加一次性的力，让它们跳动
const applySingleJumpToBalls = () => {
  if (!engine) return;

  balls.forEach((ball) => {
    // 施加一个向上的力，让扭蛋跳动
    const angle = (Math.random() - 0.5) * Math.PI * 0.5; // -45° 到 45° 的随机角度
    const forceMagnitude = 0.05; // 一次性力的大小，比持续力稍大
    Body.applyForce(ball.body, ball.body.position, {
      x: Math.sin(angle) * forceMagnitude,
      y: -Math.abs(Math.cos(angle)) * forceMagnitude, // 主要向上
    });
  });
};

// 点击抽奖按钮的处理函数
const handleButtonClick = (event: MouseEvent) => {
  // 阻止事件冒泡，避免触发机器主体的点击事件
  event.stopPropagation();

  // 如果禁用或正在动画中，则忽略点击
  if (props.disabled || isAnimating.value || isShaking.value || !engine) return;

  // 发出 start 事件，由父组件控制状态
  emit("start");
};

// 检查点击是否在按钮区域内
const isClickOnButton = (event: MouseEvent): boolean => {
  const button = document.querySelector('.gacha-button') as HTMLElement;
  if (!button) return false;

  const buttonRect = button.getBoundingClientRect();
  const clickX = event.clientX;
  const clickY = event.clientY;

  return (
    clickX >= buttonRect.left &&
    clickX <= buttonRect.right &&
    clickY >= buttonRect.top &&
    clickY <= buttonRect.bottom
  );
};

// 点击机器主体：立刻抖动；抖动未结束前再次点击无效
const handleMachineBodyClick = (event: MouseEvent) => {
  // 如果正在动画中、正在持续抖动、正在单次抖动、或点击的是按钮，则忽略
  if (
    isAnimating.value ||
    isShaking.value ||
    isSingleShaking.value ||
    isClickOnButton(event) ||
    !engine
  ) {
    return;
  }

  // 执行单次抖动（并上锁）
  playSingleShake();

  // 给扭蛋施加一次性力，让它们跳动
  applySingleJumpToBalls();
};

// 抖动动画（持续抖动，用于抽奖时）
const startShakeAnimation = () => {
  if (!machineBodyRef.value) return;

  let shakeCount = 0;
  const maxShakes = 40; // 2秒内抖动40次（每50ms一次）

  const shake = () => {
    if (!machineBodyRef.value || !isShaking.value) {
      if (machineBodyRef.value) {
        machineBodyRef.value.style.transform = '';
      }
      return;
    }

    const intensity = 3; // 抖动强度（像素）
    const offsetX = (Math.random() - 0.5) * intensity;
    const offsetY = (Math.random() - 0.5) * intensity;

    machineBodyRef.value.style.transform = `translate(${offsetX}px, ${offsetY}px)`;

    shakeCount++;
    if (shakeCount < maxShakes) {
      shakeIntervalId = window.setTimeout(shake, 50);
    } else {
      machineBodyRef.value.style.transform = '';
      isShaking.value = false;
    }
  };

  shake();
};

// 单次抖动动画（用于点击机器主体时）- 基于中心点的左右旋转
const playSingleShake = () => {
  if (!machineBodyRef.value || isAnimating.value || isShaking.value || isSingleShaking.value) return;
  isSingleShaking.value = true;

  let shakeCount = 0;
  const maxShakes = 8; // 单次抖动8次（约400ms）
  const maxAngle = 3; // 最大旋转角度（度），左右各3度

  const shake = () => {
    if (!machineBodyRef.value) {
      isSingleShaking.value = false;
      return;
    }

    // 左右快速旋转，角度在 -maxAngle 到 maxAngle 之间随机
    // 使用交替方向让抖动更自然
    const direction = shakeCount % 2 === 0 ? 1 : -1;
    const angle = direction * maxAngle * (0.5 + Math.random() * 0.5);

    machineBodyRef.value.style.transform = `rotate(${angle}deg)`;

    shakeCount++;
    if (shakeCount < maxShakes) {
      singleShakeTimeoutId = window.setTimeout(shake, 50);
    } else {
      // 抖动结束，恢复原位置
      machineBodyRef.value.style.transform = '';
      singleShakeTimeoutId = null;
      isSingleShaking.value = false;
    }
  };

  shake();
};

// 监听抖动状态变化
watch(isShaking, (newVal) => {
  if (newVal) {
    startShakeAnimation();
    // 在抖动期间持续给扭蛋施加力（每100ms一次，参考 PhysicsCanvas）
    if (ballForceIntervalId !== null) {
      clearInterval(ballForceIntervalId);
    }
    ballForceIntervalId = window.setInterval(applyRandomForcesToBalls, 100);
  } else {
    if (shakeIntervalId !== null) {
      clearTimeout(shakeIntervalId);
      shakeIntervalId = null;
    }
    if (machineBodyRef.value) {
      machineBodyRef.value.style.transform = '';
    }
    // 停止持续施加力
    if (ballForceIntervalId !== null) {
      clearInterval(ballForceIntervalId);
      ballForceIntervalId = null;
    }
  }
});

// 监听状态变化：
// - shaking: 由父组件控制是否开始/结束抖动（避免在父组件弹窗校验时，组件内部提前开启动画）
// - dropping: 在 dropping 阶段生成随机扭蛋索引
watch(
  () => props.status,
  (newStatus, oldStatus) => {
    if (newStatus === "shaking" && oldStatus !== "shaking") {
      isShaking.value = true;
    } else if (oldStatus === "shaking" && newStatus !== "shaking") {
      isShaking.value = false;
    }

    // 当状态变为 dropping 时，随机选择扭蛋素材
    if (newStatus === "dropping" && oldStatus !== "dropping") {
      currentBallIndex.value = Math.floor(Math.random() * 4); // 0-3
      exitBallRestRotation.value = 0;
    }
  }
);
</script>

<template>
  <div class="gacha-machine-container">
    <div class="machine-body" ref="machineBodyRef">
      <div class="machine-top">
        <img :src="topImage" alt="扭蛋机上半部分" class="top-image" />
        <div class="glass-cover">
          <img :src="glassCoverImage" alt="玻璃罩" class="glass-cover-image" />
          <div class="gacha-balls-container" ref="containerRef"></div>
        </div>
      </div>
      <div class="machine-bottom">
        <img :src="bottomImage" alt="扭蛋机下半部分" class="bottom-image" />
        <img :src="buttonImage" alt="抽奖按钮" class="gacha-button" @click="handleButtonClick" />
        <div class="exit-gate" ref="exitGateRef">
          <div class="exit-gate-inner">
            <!-- 内部球：在出奖口内部掉落，被 overflow:hidden 裁剪 -->
            <InnerBall2 :status="status || 'idle'" :prize="prize" :ball-index="currentBallIndex"
              @rest="handleInnerBallRest" />
          </div>
        </div>
      </div>
    </div>
    <!-- 外部球：展示阶段，通过 Teleport 渲染到 body -->
    <GachaBall2 :status="status || 'idle'" :prize="prize" :gate-el="exitGateRef" :ball-index="currentBallIndex"
      :initial-rotation="exitBallRestRotation" @confirm="emit('confirm')" />
    <OverlayMask2 :active="status === 'revealing' || status === 'open'" />
  </div>
</template>

<style scoped>
.gacha-machine-container {
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
}

.machine-body {
  position: relative;
  left: 6%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  width: 100%;
  max-width: 500px;
  transition: transform 0.05s ease-out;
  cursor: pointer;
  transform-origin: center center;
  /* 确保旋转基于中心点 */
}

.machine-top {
  position: relative;
  width: 100%;
  display: flex;
  justify-content: center;
  line-height: 0;
}

.machine-bottom {
  width: 75%;
  display: flex;
  justify-content: center;
  line-height: 0;
  margin-right: 12%;
}

.top-image,
.bottom-image {
  width: 100%;
  height: auto;
  display: block;
  object-fit: contain;
}

/* 确保上下两部分无缝衔接 */
.machine-top {
  margin-bottom: 0;
}

.machine-bottom {
  margin-top: 0;
}

.glass-cover {
  position: absolute;
  top: 35.2%;
  left: 43.6%;
  transform: translateX(-50%);
  width: 54.5%;
  aspect-ratio: 1;
  height: auto;
  pointer-events: none;
}

.glass-cover-image {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: contain;
  border-radius: 50%;
  pointer-events: none;
}

.gacha-balls-container {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: auto;
  border-radius: 50%;
  overflow: hidden;
}

.machine-bottom {
  position: relative;
}

.gacha-button {
  position: absolute;
  bottom: 62%;
  left: 50%;
  transform: translateX(-50%);
  width: 20%;
  height: auto;
  cursor: pointer;
  transition: all 0.2s ease;
  filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.3)) drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2));
  z-index: 10;
}

.gacha-button:active {
  filter: none;
}

.exit-gate {
  position: absolute;
  bottom: 17%;
  left: 50%;
  transform: translateX(-50%);
  width: 20%;
  height: 30%;
  z-index: 5;
  background-color: #fba29a;
  border-top-left-radius: 10px;
  border-top-right-radius: 10px;
  display: flex;
  justify-content: center;
  align-items: center;
}

.exit-gate-inner {
  width: calc(100% - 10px);
  height: calc(100% - 10px);
  background-color: #c6d4df;
  box-shadow: inset 0 4px 12px rgba(0, 0, 0, 0.4), inset 0 2px 6px rgba(0, 0, 0, 0.3);
  display: flex;
  justify-content: center;
  align-items: center;
  border-radius: 5px;
}
</style>
