import { createStore } from 'redux';

const WIDTH = 800;
const HEIGHT = 450;
const canvas = document.getElementById('board');
const context = canvas.getContext('2d');

const initialState = {
  cities: [
    {
      position: {
        x: 60,
        y: HEIGHT - 10,
      },
    },
    {
      position: {
        x: 160,
        y: HEIGHT - 10,
      },
    },
    {
      position: {
        x: 450,
        y: HEIGHT - 10,
      },
    },
    {
      position: {
        x: 600,
        y: HEIGHT - 10,
      },
    },
  ],
  enemyMissiles: [],
  timeTillNextMissileSpawn: 3,
  playerMissiles: [],
  explosions: [],
};

const createExplosion = (position) => ({
  position,
  radius: 1,
});

const reducer = (state = initialState, { type, deltaTime, ...payload }) => {
  switch (type) {
    case 'SPAWN_MISSILE': {
      const x = Math.random() * (WIDTH + 1);
      const cityIndex = Math.floor(Math.random() * state.cities.length);
      const {
        position: { x: targetX, y: targetY },
      } = state.cities[cityIndex];
      const targetAngle = {
        x: targetX - x,
        y: targetY,
      };
      const targetLength = Math.sqrt(
        targetAngle.x * targetAngle.x + targetAngle.y * targetAngle.y,
      );

      return {
        ...state,
        timeTillNextMissileSpawn: 3,
        enemyMissiles: [
          ...state.enemyMissiles,
          {
            initialPosition: {
              x,
              y: 0,
            },
            position: {
              x,
              y: 0,
            },
            angle: {
              x: targetAngle.x / targetLength,
              y: targetAngle.y / targetLength,
            },
            velocity: Math.random() * (10 - 3 + 1) + 3,
          },
        ],
      };
    }
    case 'SPAWN_DEFENSE_MISSILE': {
      const origin = {
        x: WIDTH / 2,
        y: HEIGHT - 10,
      };
      const targetAngle = {
        x: payload.pos.x - origin.x,
        y: payload.pos.y - origin.y,
      };
      const targetLength = Math.sqrt(
        targetAngle.x * targetAngle.x + targetAngle.y * targetAngle.y,
      );
      return {
        ...state,
        playerMissiles: [
          ...state.playerMissiles,
          {
            origin,
            position: origin,
            angle: {
              x: targetAngle.x / targetLength,
              y: targetAngle.y / targetLength,
            },
            velocity: 30,
            target: {
              x: payload.pos.x,
              y: payload.pos.y,
            },
          },
        ],
      };
    }
    case 'TICK': {
      const newExplosions = [];
      const nextPlayerMissiles = state.playerMissiles.reduce(
        (missiles, missile) => {
          const {
            position: { x, y },
            velocity,
            angle,
            target,
          } = missile;

          if (y <= target.y) {
            newExplosions.push(createExplosion(target));
            return missiles;
          }

          return [
            ...missiles,
            {
              ...missile,
              position: {
                x: x + angle.x * velocity * deltaTime,
                y: y + angle.y * velocity * deltaTime,
              },
            },
          ];
        },
        [],
      );
      const nextEnemyMissiles = state.enemyMissiles.reduce(
        (missiles, missile) => {
          const {
            position: { x, y },
            velocity,
            angle,
          } = missile;

          if (y > HEIGHT) {
            return missiles;
          }

          const preExplode = state.explosions.some(({ position, radius }) => {
            return (
              (x - position.x) ** 2 + (y - position.y) ** 2 <= radius * radius
            );
          });

          if (preExplode) {
            newExplosions.push(createExplosion({ x, y }));
            return missiles;
          }

          return [
            ...missiles,
            {
              ...missile,
              position: {
                x: x + angle.x * velocity * deltaTime,
                y: y + angle.y * velocity * deltaTime,
              },
            },
          ];
        },
        [],
      );

      return {
        ...state,
        timeTillNextMissileSpawn: state.timeTillNextMissileSpawn - deltaTime,
        enemyMissiles: nextEnemyMissiles,
        playerMissiles: nextPlayerMissiles,
        explosions: [
          ...state.explosions.reduce((next, exp) => {
            const { radius } = exp;
            if (exp.radius > 30) {
              return next;
            }

            return [...next, { ...exp, radius: radius + 12 * deltaTime }];
          }, []),
          ...newExplosions,
        ],
      };
    }
    default:
      return state;
  }
};

const store = createStore(reducer);

const renderTerrain = () => {
  context.fillStyle = 'rgb(15, 199, 91)';
  context.fillRect(0, HEIGHT - 10, WIDTH, HEIGHT);
};
const renderCity = ({ position: { x, y } }) => {
  context.fillStyle = 'rgb(171, 88, 229)';
  context.fillRect(x - 20, y - 20, 40, 20);
};
const renderEnemyMissiles = ({ position: { x, y }, initialPosition }) => {
  // Path
  context.strokeStyle = 'rgb(255, 54, 54)';
  context.lineWidth = 1;
  context.lineCap = 'round';
  context.beginPath();
  context.moveTo(initialPosition.x, initialPosition.y);
  context.lineTo(x, y);
  context.stroke();
  // Missile
  context.fillStyle = 'white';
  context.moveTo(x, y);
  context.arc(x, y, 1, 0, Math.PI * 2, false);
  context.fill();
};
const renderPlayerMissiles = ({ position: { x, y }, origin }) => {
  // Path
  context.strokeStyle = 'rgb(54, 251, 255)';
  context.lineWidth = 1;
  context.lineCap = 'round';
  context.beginPath();
  context.moveTo(origin.x, origin.y);
  context.lineTo(x, y);
  context.stroke();
  // Missile
  context.fillStyle = 'white';
  context.moveTo(x, y);
  context.arc(x, y, 1, 0, Math.PI * 2, false);
  context.fill();
};
const renderExplosions = ({ position: { x, y }, radius }) => {
  context.fillStyle = 'rgb(255, 237, 54)';
  context.moveTo(x, y);
  context.arc(x, y, radius, 0, Math.PI * 2, false);
  context.fill();
};

canvas.addEventListener('click', (e) => {
  const boundingRect = canvas.getBoundingClientRect();
  const pos = {
    x: (e.clientX * WIDTH) / boundingRect.width,
    y: ((e.clientY - boundingRect.top) * HEIGHT) / boundingRect.height,
  };

  store.dispatch({ type: 'SPAWN_DEFENSE_MISSILE', pos });
});

function gameLoop(time) {
  if (gameLoop.previousTime == null) {
    gameLoop.previousTime = time;
  }

  const deltaTime = (time - gameLoop.previousTime) / 1000;
  gameLoop.previousTime = time;

  // Update
  store.dispatch({ type: 'TICK', deltaTime });
  const { timeTillNextMissileSpawn } = store.getState();

  if (timeTillNextMissileSpawn <= 0) {
    store.dispatch({ type: 'SPAWN_MISSILE' });
  }

  // Render

  context.fillStyle = 'black';
  context.fillRect(0, 0, canvas.width, canvas.height);
  renderTerrain();

  const state = store.getState();
  state.cities.forEach(renderCity);
  state.enemyMissiles.forEach(renderEnemyMissiles);
  state.playerMissiles.forEach(renderPlayerMissiles);
  state.explosions.forEach(renderExplosions);

  requestAnimationFrame(gameLoop);
}

requestAnimationFrame(gameLoop);
