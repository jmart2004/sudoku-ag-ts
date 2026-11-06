import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { App } from "@capacitor/app";
import { StatusBar, Style } from "@capacitor/status-bar";
import { useTheme } from "../game/theme";
import { isNativeApp } from "../platform";

// Android-only glue: the hardware back button, invite links opened in the
// app, and a status bar that matches the theme. Renders nothing.
const NativeBridge: React.FC = () => {
  const navigate = useNavigate();
  const theme = useTheme();

  useEffect(() => {
    if (!isNativeApp) return;
    const back = App.addListener("backButton", ({ canGoBack }) => {
      if (canGoBack) window.history.back();
      else App.exitApp();
    });
    // An invite link (https://<site>/room/ABCD) tapped elsewhere on the phone.
    const open = App.addListener("appUrlOpen", ({ url }) => {
      try {
        const { pathname } = new URL(url);
        navigate(pathname.startsWith("/room/") ? pathname : "/");
      } catch {}
    });
    return () => {
      back.then((l) => l.remove());
      open.then((l) => l.remove());
    };
  }, [navigate]);

  useEffect(() => {
    if (!isNativeApp) return;
    const dark = theme === "dark";
    StatusBar.setStyle({ style: dark ? Style.Dark : Style.Light }).catch(
      () => {}
    );
    StatusBar.setBackgroundColor({ color: dark ? "#0b0f1a" : "#f5f6fb" }).catch(
      () => {}
    );
  }, [theme]);

  return null;
};

export default NativeBridge;
