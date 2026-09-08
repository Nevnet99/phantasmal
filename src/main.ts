import "@/design-system/styles/global.css";
import "@/styles/app.css";
import "@ds";
import Alpine from "alpinejs";
import { vaultSetup } from "./app/vault-setup";

Alpine.data("vaultSetup", vaultSetup);

Alpine.start();
