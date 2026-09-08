import "@/design-system/styles/global.css";
import "@/styles/app.css";
import "@ds";
import Alpine from "alpinejs";
import { phantasmalApp } from "./app/phantasmal-app";

Alpine.data("phantasmalApp", phantasmalApp);
Alpine.start();
