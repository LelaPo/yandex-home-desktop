import { useEffect, useState, useMemo } from "react";
import { 
  Lightbulb, 
  RefreshCw, 
  Key, 
  Play, 
  Zap, 
  Layers, 
  Star, 
  Search,
  Plug,
  LampDesk,
  ToggleRight,
  FolderEdit
} from "lucide-react";
import { 
  fetchSmartHomeData, 
  toggleDevice, 
  triggerScenario, 
  getToken, 
  saveToken,
  setLocalDeviceRoom 
} from "./api";
import { Device, Scenario } from "./types";
import "./App.css";

function DeviceIcon({ type, className }: { type: string; className?: string }) {
  if (type.includes("torchere")) return <LampDesk className={className} />;
  if (type.includes("socket")) return <Plug className={className} />;
  if (type.includes("switch")) return <ToggleRight className={className} />;
  return <Lightbulb className={className} />;
}

export default function App() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [rooms, setRooms] = useState<string[]>([]);
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [loading, setLoading] = useState(false);
  const [tokenInput, setTokenInput] = useState(getToken());
  const [showSettings, setShowSettings] = useState(!getToken());
  const [error, setError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("favorite_devices") || "[]");
    } catch {
      return [];
    }
  });

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchSmartHomeData();
      setDevices(data.devices);
      setRooms(data.rooms);
      setScenarios(data.scenarios);
    } catch (err: any) {
      console.error(err);
      setError(String(err?.message || err || "Ошибка загрузки"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (getToken()) loadData();
  }, []);

  const toggleFavorite = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setFavorites((prev) => {
      const next = prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id];
      localStorage.setItem("favorite_devices", JSON.stringify(next));
      return next;
    });
  };

  const handleToggleDevice = async (device: Device) => {
    const onOffCap = device.capabilities.find(
      (c) => c.type === "devices.capabilities.on_off"
    );
    const currentState = onOffCap?.state?.value ?? false;
    const nextState = !currentState;

    setDevices((prev) =>
      prev.map((d) => {
        if (d.id !== device.id) return d;
        return {
          ...d,
          capabilities: d.capabilities.map((c) =>
            c.type === "devices.capabilities.on_off"
              ? { ...c, state: { ...c.state, instance: "on", value: nextState } }
              : c
          ),
        };
      })
    );

    try {
      await toggleDevice(device.id, nextState);
    } catch (err: any) {
      alert(`Не удалось переключить устройство: ${err.message || err}`);
      loadData();
    }
  };

  const handleChangeRoom = (e: React.MouseEvent, device: Device) => {
    e.stopPropagation();
    const newRoom = prompt(
      `Укажите комнату для устройства "${device.name}":`,
      device.roomName !== "Без комнаты" ? device.roomName : ""
    );
    if (newRoom !== null) {
      setLocalDeviceRoom(device.id, newRoom.trim() || "Без комнаты");
      loadData();
    }
  };

  const handleRunScenario = async (sc: Scenario) => {
    try {
      await triggerScenario(sc.id);
    } catch (err: any) {
      alert(`Ошибка выполнения сценария: ${err.message || err}`);
    }
  };

  const displayedDevices = useMemo(() => {
    return devices.filter((d) => {
      if (activeTab === "FAVORITES") {
        if (!favorites.includes(d.id)) return false;
      } else if (activeTab !== "ALL") {
        if (d.roomName !== activeTab) return false;
      }

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        return (
          d.name.toLowerCase().includes(query) ||
          d.roomName.toLowerCase().includes(query)
        );
      }
      return true;
    });
  }, [devices, favorites, activeTab, searchQuery]);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-5 flex flex-col gap-5 select-none">
      {/* Шапка */}
      <header className="flex items-center justify-between border-b border-zinc-800/80 pb-4">
        <div>
          <h1 className="text-lg font-bold flex items-center gap-2">
            <Zap className="text-yellow-400 w-5 h-5 fill-yellow-400" /> Яндекс Дом
          </h1>
          <p className="text-xs text-zinc-500">ПК-клиент управления умным домом</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            disabled={loading}
            className="p-2 hover:bg-zinc-800 rounded-xl transition-colors border border-zinc-800/80 text-zinc-300 disabled:opacity-50 cursor-pointer"
            title="Обновить"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 hover:bg-zinc-800 rounded-xl transition-colors border border-zinc-800/80 text-zinc-300 cursor-pointer"
            title="Настройки токена"
          >
            <Key className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Модалка/панель токена */}
      {showSettings && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex flex-col gap-3">
          <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
            OAuth-токен Яндекса:
          </label>
          <div className="flex gap-2">
            <input
              type="password"
              placeholder="y0__wg..."
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-yellow-400 font-mono"
            />
            <button
              onClick={() => {
                saveToken(tokenInput);
                setShowSettings(false);
                loadData();
              }}
              className="bg-yellow-400 hover:bg-yellow-500 text-black font-semibold px-4 py-2 rounded-xl text-xs transition-colors cursor-pointer"
            >
              Сохранить
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-950/60 border border-red-800 text-red-300 p-3 rounded-xl text-xs font-mono">
          {error}
        </div>
      )}

      {/* Вкладки: Все | Избранное | Комнаты из API */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        <button
          onClick={() => setActiveTab("ALL")}
          className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
            activeTab === "ALL"
              ? "bg-zinc-100 text-zinc-900 shadow-md"
              : "bg-zinc-900 border border-zinc-800/80 text-zinc-400 hover:text-zinc-200"
          }`}
        >
          Все ({devices.length})
        </button>

        <button
          onClick={() => setActiveTab("FAVORITES")}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
            activeTab === "FAVORITES"
              ? "bg-yellow-400 text-black shadow-md shadow-yellow-400/20"
              : "bg-zinc-900 border border-zinc-800/80 text-zinc-400 hover:text-zinc-200"
          }`}
        >
          <Star className={`w-3.5 h-3.5 ${activeTab === "FAVORITES" ? "fill-black" : "text-yellow-400 fill-yellow-400"}`} />
          Избранное ({favorites.length})
        </button>

        {rooms.map((room) => (
          <button
            key={room}
            onClick={() => setActiveTab(room)}
            className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              activeTab === room
                ? "bg-zinc-100 text-zinc-900 shadow-md"
                : "bg-zinc-900 border border-zinc-800/80 text-zinc-400 hover:text-zinc-200"
            }`}
          >
            {room}
          </button>
        ))}
      </div>

      {/* Поиск */}
      <div className="relative">
        <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-zinc-500" />
        <input
          type="text"
          placeholder="Поиск по устройствам..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-zinc-900/60 border border-zinc-800/80 rounded-xl pl-9 pr-3 py-2 text-xs focus:outline-none focus:border-yellow-400 transition-colors"
        />
      </div>

      {/* Сетка устройств */}
      <section className="flex flex-col gap-3">
        {displayedDevices.length === 0 && !loading && (
          <div className="p-12 border border-dashed border-zinc-800 rounded-3xl text-center text-zinc-500 text-xs">
            {activeTab === "FAVORITES"
              ? "В избранном пока пусто. Нажми звёздочку ⭐ на карточке любого устройства."
              : "Устройства не найдены."}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {displayedDevices.map((device) => {
            const onOff = device.capabilities.find(
              (c) => c.type === "devices.capabilities.on_off"
            );
            const isOn = onOff?.state?.value ?? false;
            const isFav = favorites.includes(device.id);

            return (
              <div
                key={device.id}
                onClick={() => handleToggleDevice(device)}
                className={`group cursor-pointer p-4 rounded-2xl border transition-all duration-200 flex flex-col justify-between gap-4 relative overflow-hidden ${
                  isOn
                    ? "bg-zinc-900 border-yellow-500/50 shadow-lg shadow-yellow-500/10"
                    : "bg-zinc-900/50 border-zinc-800/80 hover:border-zinc-700 hover:bg-zinc-900/80"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div
                    className={`p-3 rounded-xl transition-colors ${
                      isOn ? "bg-yellow-400 text-black shadow-sm" : "bg-zinc-800 text-zinc-400"
                    }`}
                  >
                    <DeviceIcon type={device.type} className="w-5 h-5" />
                  </div>

                  <div className="flex items-center gap-1">
                    {/* Кнопка смены/назначения комнаты */}
                    <button
                      onClick={(e) => handleChangeRoom(e, device)}
                      className="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-600 hover:text-zinc-300 transition-colors opacity-0 group-hover:opacity-100"
                      title="Назначить комнату"
                    >
                      <FolderEdit className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={(e) => toggleFavorite(e, device.id)}
                      className="p-1.5 hover:bg-zinc-800 rounded-lg transition-colors text-zinc-600 hover:text-yellow-400"
                      title={isFav ? "Убрать из избранного" : "В избранное"}
                    >
                      <Star
                        className={`w-4 h-4 transition-colors ${
                          isFav ? "fill-yellow-400 text-yellow-400" : ""
                        }`}
                      />
                    </button>

                    <div
                      className={`w-2.5 h-2.5 rounded-full ml-1 transition-colors ${
                        isOn ? "bg-yellow-400 shadow-sm shadow-yellow-400" : "bg-zinc-700"
                      }`}
                    />
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-zinc-100 text-sm leading-tight truncate">
                    {device.name}
                  </h3>
                  <div className="flex items-center justify-between mt-1 text-xs text-zinc-500">
                    <span>{isOn ? "Включено" : "Выключено"}</span>
                    {device.roomName && device.roomName !== "Без комнаты" && (
                      <span className="text-[11px] text-zinc-400 bg-zinc-800/80 px-2 py-0.5 rounded-md">
                        {device.roomName}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Сценарии */}
      {scenarios.length > 0 && (
        <section className="flex flex-col gap-3 mt-2 pt-4 border-t border-zinc-800/80">
          <h2 className="text-xs font-semibold tracking-wider uppercase text-zinc-500 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5" /> Сценарии ({scenarios.length})
          </h2>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {scenarios.map((sc) => (
              <button
                key={sc.id}
                onClick={() => handleRunScenario(sc)}
                className="flex items-center gap-2 p-2.5 bg-zinc-900/60 border border-zinc-800/80 hover:border-zinc-700 rounded-xl text-left transition-colors group cursor-pointer"
              >
                <Play className="w-3 h-3 text-zinc-500 group-hover:text-yellow-400 transition-colors" />
                <span className="text-xs font-medium text-zinc-300 truncate">
                  {sc.name}
                </span>
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}