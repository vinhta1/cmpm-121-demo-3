// @deno-types="npm:@types/leaflet@^1.9.14"
import leaflet from "leaflet";

// Style sheets
import "leaflet/dist/leaflet.css";
import "./style.css";

// Fix missing marker images
import "./leafletWorkaround.ts";

// Deterministic random number generator
import luck from "./luck.ts";

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

const OAKES_105 = leaflet.latLng(36.989537734448085, -122.06277874417984);
const TILE_SIZE = 1e-4;
const NEIGHBORHOOD_SIZE = 8;
const CACHE_SPAWN_PROBABILITY = 0.1;

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

function createCache(i: number, j: number) {
  const origin = OAKES_105;
  const bounds = leaflet.latLngBounds([
    [origin.lat + i * TILE_SIZE, origin.lng + j * TILE_SIZE],
    [origin.lat + (i + 1) * TILE_SIZE, origin.lng + (j + 1) * TILE_SIZE],
  ]);

  const rect = leaflet.rectangle(bounds);
  rect.addTo(map);
  let coinCount = Math.floor(luck([i, j].toString()) * 100);
  rect.bindPopup(() => {
    const popupDiv = document.createElement("div");
    popupDiv.innerHTML =
      `<div>There is a cache here at "${i}, ${j}". It has <span id="value">${coinCount}</span> coins.</div>
    <button id="collect">Collect</button><button id="dropoff">Drop Off</button>`;

    popupDiv
      .querySelector<HTMLButtonElement>("#collect")!
      .addEventListener("click", () => {
        if (coinCount > 0) {
          coinCount--;
          popupDiv.querySelector<HTMLSpanElement>("#value")!.innerHTML =
            coinCount.toString();
        }
      });
    popupDiv
      .querySelector<HTMLButtonElement>("#dropoff")!
      .addEventListener("click", () => {
        coinCount++;
        popupDiv.querySelector<HTMLSpanElement>("#value")!.innerHTML = coinCount
          .toString();
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
