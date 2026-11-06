import { isDatabaseReady } from "../../db/prisma.js";
import { PrismaRoomRepository } from "./prismaRepository.js";
import type { Room } from "@synctune/shared-types";

export interface IRoomRepository {
  findById(id: string): Promise<Room | null>;
  create(room: Room): Promise<Room>;
  update(room: Room): Promise<Room>;
  delete(id: string): Promise<boolean>;
  list(): Promise<Room[]>;
}

export class InMemoryRoomRepository implements IRoomRepository {
  private rooms: Map<string, Room> = new Map();

  async findById(id: string): Promise<Room | null> {
    const room = this.rooms.get(id);
    return room ? JSON.parse(JSON.stringify(room)) : null;
  }

  async create(room: Room): Promise<Room> {
    const copy = JSON.parse(JSON.stringify(room));
    this.rooms.set(room.id, copy);
    return copy;
  }

  async update(room: Room): Promise<Room> {
    const copy = JSON.parse(JSON.stringify(room));
    this.rooms.set(room.id, copy);
    return copy;
  }

  async delete(id: string): Promise<boolean> {
    return this.rooms.delete(id);
  }

  async list(): Promise<Room[]> {
    return Array.from(this.rooms.values()).map((r) =>
      JSON.parse(JSON.stringify(r))
    );
  }
}

export const inMemoryRoomRepository = new InMemoryRoomRepository();
let activeRepository: IRoomRepository = inMemoryRoomRepository;

export function getRoomRepository(): IRoomRepository {
  if (isDatabaseReady() && !(activeRepository instanceof PrismaRoomRepository)) {
    activeRepository = new PrismaRoomRepository();
  }
  return activeRepository;
}

export function setRoomRepository(repo: IRoomRepository): void {
  activeRepository = repo;
}

// Proxied roomRepository export maintains compatibility with existing imports
export const roomRepository: IRoomRepository = {
  findById: (id) => getRoomRepository().findById(id),
  create: (room) => getRoomRepository().create(room),
  update: (room) => getRoomRepository().update(room),
  delete: (id) => getRoomRepository().delete(id),
  list: () => getRoomRepository().list(),
};
