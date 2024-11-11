// todo
import "./style.css";

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
