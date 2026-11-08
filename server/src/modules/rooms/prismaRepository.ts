import { prisma } from "../../db/prisma.js";
import type { IRoomRepository } from "./repository.js";
import type { Room, Participant, QueueItem, PlaybackState } from "@synctune/shared-types";

export class PrismaRoomRepository implements IRoomRepository {
  async findById(id: string): Promise<Room | null> {
    const record = await prisma.room.findUnique({
      where: { id },
      include: {
        participants: true,
        queueItems: {
          orderBy: { order: "asc" },
        },
      },
    });

    if (!record) return null;

    const participants: Participant[] = record.participants.map((p: any) => ({
      id: p.id,
      username: p.username,
      avatar: p.avatar,
      role: p.role as "HOST" | "LISTENER",
      connectedAt: p.joinedAt.getTime(),
      isConnected: p.isConnected,
    }));

    const queue: QueueItem[] = record.queueItems.map((q: any) => ({
      id: q.id,
      videoId: q.videoId,
      title: q.title,
      artist: q.artist,
      duration: q.duration,
      thumbnailUrl: q.thumbnailUrl,
      addedBy: {
        participantId: q.addedById,
        username: q.addedByName,
        avatar: q.addedByAvatar,
      },
      addedAt: q.addedAt.getTime(),
    }));

    const playback: PlaybackState = {
      videoId: record.currentVideoId,
      status: record.playbackStatus as PlaybackState["status"],
      position: record.playbackPosition,
      updatedAt: Number(record.playbackUpdatedAt),
      revision: record.playbackRevision,
    };

    return {
      id: record.id,
      name: record.name,
      hostId: record.hostId,
      participants,
      currentPlaybackState: playback,
      queue,
      createdAt: record.createdAt.getTime(),
      status: record.status as Room["status"],
      settings: {
        isPrivate: record.isPrivate,
        allowListenerQueue: record.allowListenerQueue,
      },
    };
  }

  async create(room: Room): Promise<Room> {
    await prisma.room.create({
      data: {
        id: room.id,
        name: room.name,
        hostId: room.hostId,
        status: room.status,
        isPrivate: room.settings?.isPrivate ?? false,
        allowListenerQueue: room.settings?.allowListenerQueue ?? true,
        currentVideoId: room.currentPlaybackState.videoId,
        playbackStatus: room.currentPlaybackState.status,
        playbackPosition: room.currentPlaybackState.position,
        playbackUpdatedAt: BigInt(room.currentPlaybackState.updatedAt),
        playbackRevision: room.currentPlaybackState.revision,
        createdAt: new Date(room.createdAt),
      },
    });

    // Create initial participants if any
    if (room.participants.length > 0) {
      await prisma.roomParticipant.createMany({
        data: room.participants.map((p: any) => ({
          id: p.id,
          roomId: room.id,
          username: p.username,
          avatar: p.avatar,
          role: p.role,
          isConnected: p.isConnected ?? true,
          joinedAt: new Date(p.connectedAt),
          lastSeenAt: new Date(p.connectedAt),
        })),
        skipDuplicates: true,
      });
    }

    return room;
  }

  async update(room: Room): Promise<Room> {
    await prisma.room.update({
      where: { id: room.id },
      data: {
        name: room.name,
        hostId: room.hostId,
        status: room.status,
        isPrivate: room.settings?.isPrivate ?? false,
        allowListenerQueue: room.settings?.allowListenerQueue ?? true,
        currentVideoId: room.currentPlaybackState.videoId,
        playbackStatus: room.currentPlaybackState.status,
        playbackPosition: room.currentPlaybackState.position,
        playbackUpdatedAt: BigInt(room.currentPlaybackState.updatedAt),
        playbackRevision: room.currentPlaybackState.revision,
      },
    });

    // Synchronize participants
    const activeIds = room.participants.map((p) => p.id);
    await prisma.roomParticipant.deleteMany({
      where: {
        roomId: room.id,
        id: { notIn: activeIds },
      },
    });

    for (const p of room.participants) {
      await prisma.roomParticipant.upsert({
        where: { id: p.id },
        update: {
          username: p.username,
          avatar: p.avatar,
          role: p.role,
          isConnected: p.isConnected ?? true,
          lastSeenAt: new Date(),
        },
        create: {
          id: p.id,
          roomId: room.id,
          username: p.username,
          avatar: p.avatar,
          role: p.role,
          isConnected: p.isConnected ?? true,
          joinedAt: new Date(p.connectedAt),
          lastSeenAt: new Date(p.connectedAt),
        },
      });
    }

    // Synchronize queue
    await prisma.roomQueueItem.deleteMany({
      where: { roomId: room.id },
    });

    if (room.queue.length > 0) {
      await prisma.roomQueueItem.createMany({
        data: room.queue.map((q, idx) => ({
          id: q.id,
          roomId: room.id,
          videoId: q.videoId,
          title: q.title,
          artist: q.artist,
          duration: q.duration,
          thumbnailUrl: q.thumbnailUrl,
          addedById: q.addedBy.participantId,
          addedByName: q.addedBy.username,
          addedByAvatar: q.addedBy.avatar,
          order: idx,
          addedAt: new Date(q.addedAt),
        })),
      });
    }

    return room;
  }

  async delete(id: string): Promise<boolean> {
    try {
      await prisma.room.delete({ where: { id } });
      return true;
    } catch {
      return false;
    }
  }

  async list(): Promise<Room[]> {
    const rooms = await prisma.room.findMany({
      where: { status: { not: "closed" } },
      include: {
        participants: true,
        queueItems: { orderBy: { order: "asc" } },
      },
    });

    return rooms.map((record: any) => ({
      id: record.id,
      name: record.name,
      hostId: record.hostId,
      participants: record.participants.map((p: any) => ({
        id: p.id,
        username: p.username,
        avatar: p.avatar,
        role: p.role as "HOST" | "LISTENER",
        connectedAt: p.joinedAt.getTime(),
        isConnected: p.isConnected,
      })),
      currentPlaybackState: {
        videoId: record.currentVideoId,
        status: record.playbackStatus as PlaybackState["status"],
        position: record.playbackPosition,
        updatedAt: Number(record.playbackUpdatedAt),
        revision: record.playbackRevision,
      },
      queue: record.queueItems.map((q: any) => ({
        id: q.id,
        videoId: q.videoId,
        title: q.title,
        artist: q.artist,
        duration: q.duration,
        thumbnailUrl: q.thumbnailUrl,
        addedBy: {
          participantId: q.addedById,
          username: q.addedByName,
          avatar: q.addedByAvatar,
        },
        addedAt: q.addedAt.getTime(),
      })),
      createdAt: record.createdAt.getTime(),
      status: record.status as Room["status"],
      settings: {
        isPrivate: record.isPrivate,
        allowListenerQueue: record.allowListenerQueue,
      },
    }));
  }
}
