import { fetch } from "@tauri-apps/plugin-http";
import { Device, Scenario, UserInfoResponse } from "./types";

const BASE_URL = "https://api.iot.yandex.net/v1.0";

export function getToken(): string {
  return localStorage.getItem("yandex_token") || import.meta.env.VITE_YANDEX_TOKEN || "";
}

export function saveToken(token: string) {
  localStorage.setItem("yandex_token", token.trim());
}

export function setLocalDeviceRoom(deviceId: string, roomName: string) {
  const customRooms = JSON.parse(localStorage.getItem("custom_device_rooms") || "{}");
  customRooms[deviceId] = roomName.trim();
  localStorage.setItem("custom_device_rooms", JSON.stringify(customRooms));
}

export function getLocalDeviceRooms(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem("custom_device_rooms") || "{}");
  } catch {
    return {};
  }
}

async function request(endpoint: string, options: RequestInit = {}) {
  const token = getToken();
  if (!token) throw new Error("Токен не задан. Введи его в настройках.");

  const res = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Ошибка API (${res.status}): ${errorText}`);
  }

  return res.json();
}

export async function fetchSmartHomeData(): Promise<{ 
  devices: Device[]; 
  rooms: string[]; 
  scenarios: Scenario[] 
}> {
  const data: UserInfoResponse = await request("/user/info");
  const localRooms = getLocalDeviceRooms();

  // Карта комнат из API
  const roomMap = new Map<string, string>();
  (data.rooms || []).forEach((r) => roomMap.set(r.id, r.name));

  let rawDevices: any[] = data.devices || [];

  // Фолбэк ТОЛЬКО если API вернул devices: []
  if (rawDevices.length === 0 && data.scenarios) {
    const map = new Map<string, any>();
    for (const sc of data.scenarios) {
      if (!sc.steps) continue;
      for (const step of sc.steps) {
        for (const item of step.parameters?.items || []) {
          if (item.value?.id && item.value?.capabilities) {
            map.set(item.value.id, item.value);
          }
        }
      }
    }
    rawDevices = Array.from(map.values());
  }

  // Приводим к единому типу
  const devices: Device[] = rawDevices.map((d) => {
    const apiRoomName = d.room ? roomMap.get(d.room) : undefined;
    const roomName = localRooms[d.id] || apiRoomName || "Без комнаты";

    return {
      id: d.id,
      name: d.name,
      type: d.type || "devices.types.light",
      room: d.room,
      roomName,
      capabilities: d.capabilities || [],
    };
  });

  // Собираем уникальный список комнат исключительно из данных
  const uniqueRooms = Array.from(
    new Set([
      ...(data.rooms || []).map((r) => r.name),
      ...devices.map((d) => d.roomName),
    ])
  ).filter((r) => r !== "Без комнаты");

  const scenarios: Scenario[] = (data.scenarios || []).map((s: any) => ({
    id: s.id,
    name: s.name,
    is_active: s.is_active,
  }));

  return { devices, rooms: uniqueRooms, scenarios };
}

export async function toggleDevice(deviceId: string, turnOn: boolean) {
  return request("/devices/actions", {
    method: "POST",
    body: JSON.stringify({
      devices: [
        {
          id: deviceId,
          actions: [
            {
              type: "devices.capabilities.on_off",
              state: {
                instance: "on",
                value: turnOn,
              },
            },
          ],
        },
      ],
    }),
  });
}

export async function triggerScenario(scenarioId: string) {
  return request(`/scenarios/${scenarioId}/actions`, {
    method: "POST",
  });
}