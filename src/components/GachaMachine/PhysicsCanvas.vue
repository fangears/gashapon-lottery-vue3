<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from "vue";
import Matter from "matter-js";

const containerRef = ref<HTMLDivElement | null>(null);
const canvasRef = ref<HTMLCanvasElement | null>(null);

// Matter.js 模块
const Engine = Matter.Engine,
      Render = Matter.Render,
      Runner = Matter.Runner,
      Bodies = Matter.Bodies,
      Composite = Matter.Composite,
      Events = Matter.Events,
      Body = Matter.Body;

const engine = Engine.create({ positionIterations: 20, velocityIterations: 20 });
const world = engine.world;
let render: Matter.Render | null = null;
let runner: Matter.Runner | null = null;

const BALL_COLORS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7D794'];
const balls: Matter.Body[] = [];

// 摇晃动画逻辑
let shakeInterval: ReturnType<typeof setInterval> | null = null;

const initPhysics = () => {
  if (!containerRef.value || !canvasRef.value) return;

  const width = containerRef.value.clientWidth;
  const height = containerRef.value.clientHeight;

  // 渲染器
  render = Render.create({
    canvas: canvasRef.value,
    engine: engine,
    options: {
      width,
      height,
      background: 'transparent',
      wireframes: false
    }
  });

  // 墙壁（圆形边界）
  // 匹配 HTML：半径 145，墙厚 150，分段 50
  // 如果需要，相对于实际容器大小缩放，但 300x300 是标准
  const centerX = width / 2;
  const centerY = height / 2;
  // 使用略微自适应的半径，但保持"厚墙"的感觉
  const radius = Math.min(width, height) / 2 - 5; 
  const wallThickness = 150;
  const segments = 50;
  
  for (let i = 0; i < segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    const dist = radius + wallThickness / 2; // 将墙的中心向外移动
    const wall = Bodies.rectangle(
      centerX + Math.cos(angle) * dist,
      centerY + Math.sin(angle) * dist,
      (2 * Math.PI * dist) / segments * 1.1,
      wallThickness,
      { 
        isStatic: true, 
        angle: angle + Math.PI / 2, 
        render: { fillStyle: 'transparent' } // 不可见墙壁
      }
    );
    Composite.add(world, wall);
  }

  // 内部挡板（中间/底部的小圆圈）
  // Composite.add(world, Bodies.circle(width / 2, height / 2 + 50, 30, {
  //   isStatic: true,
  //   render: { fillStyle: 'rgba(255,255,255,0.2)' }
  // }));

  // 球
  createBalls(width, height, 20);

  // 速度上限
  Events.on(engine, 'beforeUpdate', () => {
    balls.forEach(b => {
      if (b.speed > 15) {
        Body.setVelocity(b, { 
          x: b.velocity.x * (15 / b.speed), 
          y: b.velocity.y * (15 / b.speed) 
        });
      }
    });
  });

  Render.run(render);
  runner = Runner.create();
  Runner.run(runner, engine);
};

const createBalls = (w: number, h: number, count: number) => {
  for (let i = 0; i < count; i++) {
    const color = BALL_COLORS[Math.floor(Math.random() * BALL_COLORS.length)];
    const ball = Bodies.circle(
      w / 2 + (Math.random() - 0.5) * 50,
      h / 2 + (Math.random() - 0.5) * 50,
      18, // 半径 18
      {
        restitution: 0.8,
        friction: 0.005,
        frictionAir: 0.05,
        render: {
          fillStyle: color,
          strokeStyle: '#fff',
          lineWidth: 3
        }
      }
    );
    balls.push(ball);
  }
  Composite.add(world, balls);
};

const startShake = () => {
  if (shakeInterval) return;
  shakeInterval = setInterval(() => {
    balls.forEach(ball => {
      const angle = Math.random() * Math.PI * 2;
      Body.applyForce(ball, ball.position, {
        x: Math.cos(angle) * 0.035,
        y: Math.sin(angle) * 0.035 - 0.005
      });
    });
  }, 100);
};

const stopShake = () => {
  if (shakeInterval) {
    clearInterval(shakeInterval);
    shakeInterval = null;
  }
};

const shake = (duration: number) => {
  startShake();
  return new Promise<void>(resolve => {
    setTimeout(() => {
      stopShake();
      resolve();
    }, duration);
  });
};

defineExpose({ shake });

onMounted(() => {
  initPhysics();
});

onBeforeUnmount(() => {
  stopShake();
  if (render) {
    Render.stop(render);
    render.canvas.remove();
  }
  if (runner) Runner.stop(runner);
  Engine.clear(engine);
});
</script>

<template>
  <div ref="containerRef" class="physics-container">
    <canvas ref="canvasRef" />
  </div>
</template>

<style scoped>
.physics-container {
  width: 100%;
  height: 100%;
  position: absolute;
  top: 0;
  left: 0;
}
canvas {
  display: block;
}
</style>
