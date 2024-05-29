import { PrismaClient } from "@prisma/client";

import { singleton } from "~/services/prisma/singleton.server";

export const db = singleton("prisma", () => new PrismaClient());
