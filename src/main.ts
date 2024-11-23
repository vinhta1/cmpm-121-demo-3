// @deno-types="npm:@types/leaflet@^1.9.14"
import leaflet from "leaflet";

// Style sheets
import "leaflet/dist/leaflet.css";
import "./style.css";

// Fix missing marker images
import "./leafletWorkaround.ts";

// Deterministic random number generator
import luck from "./luck.ts";

interface Cell {
  readonly i: number;
  readonly j: number;
}

interface Coin {
  cell: Cell;
  serial: number;
}

export interface Board {
  readonly tileWidth: number;
  readonly tileVisibilityRadius: number;

  readonly knownCells: Map<string, Cell>;

  getCanonicalCell(cell: Cell): Cell;
  getCellForPoint(point: leaflet.LatLng): Cell;
  getCellBounds(cell: Cell): leaflet.LatLngBounds;
  getCellsNearPoint(point: leaflet.LatLng): Cell[];
}

const APP_NAME = "Eye Collector";
document.title = APP_NAME;
const appTitle = document.createElement("h1");
appTitle.innerHTML = APP_NAME;

const app = document.querySelector<HTMLDivElement>("#app")!;
app.append(appTitle);

const testButton = document.createElement("button");
testButton.innerHTML = "Button";
app.append(testButton);

testButton.addEventListener("click", () => alert("You clicked the button!"));

const _NULL_ISLAND = leaflet.latLng(0, 0);
const OAKES_105 = leaflet.latLng(36.989537734448085, -122.06277874417984);
const TILE_SIZE = 1e-4;
const NEIGHBORHOOD_SIZE = 8;
const CACHE_SPAWN_PROBABILITY = 0.1;
const newMap = new Map();

function createBoard(
  width: number,
  radius: number,
  map: Map<string, Cell>,
): Board {
  return {
    tileWidth: width,
    tileVisibilityRadius: radius,
    knownCells: map,

    getCanonicalCell(cell): Cell {
      const { i, j } = cell;
      const key = [i, j].toString();
      if (!<Cell> this.knownCells.get(key)) { //thanks Isha
        this.knownCells.set(key, { i, j });
      }
      return <Cell> this.knownCells.get(key);
    },
    getCellForPoint(point): Cell {
      return this.getCanonicalCell({ i: point.lat, j: point.lng });
    },
    getCellBounds(cell): leaflet.LatLngBounds {
      return leaflet.latLngBounds([
        [cell.i - 1 * this.tileWidth, cell.j - 1 * this.tileWidth],
        [cell.i + 1 * this.tileWidth, cell.j + 1 * this.tileWidth],
      ]);
    },
    getCellsNearPoint(point): Cell[] {
      const resultCells: Cell[] = [];
      const originCell = this.getCellForPoint(point);
      const originRadius = leaflet.latLngBounds([
        [
          (originCell.i - this.tileVisibilityRadius) * this.tileWidth,
          (originCell.j - this.tileVisibilityRadius) * this.tileWidth,
        ],
        [
          (originCell.i + this.tileVisibilityRadius) * this.tileWidth,
          (originCell.j + this.tileVisibilityRadius) * this.tileWidth,
        ],
      ]);
      for (
        let i = originCell.i - this.tileVisibilityRadius;
        i < originCell.i + this.tileVisibilityRadius;
        i++
      ) {
        for (
          let j = originCell.j - this.tileVisibilityRadius;
          j < originCell.j + this.tileVisibilityRadius;
          j++
        ) {
          const tempPoint = leaflet.latLng(i, j);
          const tempCell = this.getCellForPoint(tempPoint);
          if (originRadius.intersects(this.getCellBounds(tempCell))) {
            resultCells.push(tempCell);
          }
        }
      }
      return resultCells;
    },
  };
}

const newBoard = createBoard(TILE_SIZE, NEIGHBORHOOD_SIZE, newMap);

const map = leaflet.map(document.getElementById("map")!, {
  center: OAKES_105,
  zoom: 75,
});

leaflet
  .tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution:
      '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  })
  .addTo(map);

// Add a marker to represent the player
const playerMarker = leaflet.marker(OAKES_105);
playerMarker.bindTooltip("That's you!");
playerMarker.addTo(map);

// Display the player's points
//let playerCoins = 0;
const playerCoins: Coin[] = [];
const statusPanel = document.querySelector<HTMLDivElement>("#statusPanel")!; // element `statusPanel` is defined in index.html
statusPanel.innerHTML = "No coins yet...";

function createCache(i: number, j: number) {
  const origin = OAKES_105;
  const _originCell = newBoard.getCellForPoint(origin);
  //const bounds = newBoard.getCellBounds(originCell);
  const bounds = leaflet.latLngBounds([
    [origin.lat + i * TILE_SIZE, origin.lng + j * TILE_SIZE],
    [origin.lat + (i + 1) * TILE_SIZE, origin.lng + (j + 1) * TILE_SIZE],
  ]);

  const rect = leaflet.rectangle(bounds);
  rect.addTo(map);

  const coinCache: Coin[] = [];
  const coinCount = Math.floor(luck([i, j].toString()) * 100);
  for (let k = 0; k < coinCount; k++) {
    coinCache.push({ cell: { i: i, j: j }, serial: k });
  }

  rect.bindPopup(() => {
    const popupDiv = document.createElement("div");
    popupDiv.innerHTML = `<div>There is a cache here at "${
      Math.floor(rect.getCenter().lat * 10000)
    }, ${
      Math.floor(rect.getCenter().lng * 10000)
    }". It has <span id="value">${coinCount}</span> coins.</div>
    <button id="collect">Collect</button><button id="dropoff">Drop Off</button>`;

    popupDiv
      .querySelector<HTMLButtonElement>("#collect")!
      .addEventListener("click", () => {
        if (coinCache.length > 0) {
          playerCoins.push(coinCache.pop()!);
          popupDiv.querySelector<HTMLSpanElement>("#value")!.innerHTML =
            coinCount.toString();
          statusPanel.innerHTML = `You have ${playerCoins} coins.`;
        }
      });
    popupDiv
      .querySelector<HTMLButtonElement>("#dropoff")!
      .addEventListener("click", () => {
        if (playerCoins.length > 0) {
          coinCache.push(playerCoins.pop()!);
          popupDiv.querySelector<HTMLSpanElement>("#value")!.innerHTML =
            coinCount
              .toString();
          statusPanel.innerHTML = `You have ${playerCoins} coins.`;
        }
      });

    return popupDiv;
  });
}

for (let i = -NEIGHBORHOOD_SIZE; i < NEIGHBORHOOD_SIZE; i++) {
  for (let j = -NEIGHBORHOOD_SIZE; j < NEIGHBORHOOD_SIZE; j++) {
    if (luck([i, j].toString()) < CACHE_SPAWN_PROBABILITY) {
      createCache(i, j);
    }
  }
}
