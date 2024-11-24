import { $, Context } from "koishi";
import LockUtil from "./LockUtil";

declare module "koishi" {
  interface Tables {
    message_topic: MessageTopic;
    message_topic_subscribe: MessageTopicSubscribe;
  }
}
const MessageTopicTable = "message_topic";

export interface MessageTopic {
  id: number;
  topic: string;
  producer_quantity: number;
  create_at: Date;
  update_at: Date;
}

export interface TopicSubscribeForm {
  platform: string;
  self_id?: string;
  channel_id: string;
  binding_key: string;
  enable: boolean;
}

const MessageTopicSubscribeTable = "message_topic_subscribe";

export interface MessageTopicSubscribe {
  id: number;
  platform: string;
  self_id: string;
  channel_id: string;
  binding_key: string;
  enable: boolean;
  create_at: Date;
  update_at: Date;
}

const MessageTopicDao = {
  initDB(ctx: Context) {
    ctx.model.extend(
      MessageTopicTable,
      {
        id: "unsigned",
        topic: "string",
        producer_quantity: "integer",
        create_at: "timestamp",
        update_at: "timestamp",
      },
      {
        autoInc: true,
      },
    );
    ctx.model.extend(
      MessageTopicSubscribeTable,
      {
        id: "unsigned",
        platform: "string",
        self_id: "string",
        channel_id: "string",
        binding_key: "string",
        enable: "boolean",
        create_at: "timestamp",
        update_at: "timestamp",
      },
      {
        autoInc: true,
      },
    );
  },
  async topicProducerQuantityReturnToZero(ctx: Context) {
    await ctx.database.set(
      MessageTopicTable,
      {},
      {
        producer_quantity: 0,
      },
    );
  },
  async topicClaim(ctx: Context, topic: string) {
    await LockUtil.synchronized({
      key: "MessageTopicService.topicProducerQuantity",
      fn: async () => {
        const rows = await ctx.database.get(MessageTopicTable, {
          topic: topic,
        });
        const date = new Date();
        if (rows.length < 1) {
          await ctx.database.create(MessageTopicTable, {
            topic: topic,
            producer_quantity: 1,
            create_at: date,
            update_at: date,
          });
        } else {
          await ctx.database.set(MessageTopicTable, rows[0].id, (row) => ({
            producer_quantity: $.add(row.producer_quantity, 1),
            update_at: date,
          }));
        }
      },
    });
  },
  async topicAbandon(ctx: Context, topic: string) {
    await LockUtil.synchronized({
      key: "MessageTopicService.topicProducerQuantity",
      fn: async () => {
        const rows = await ctx.database.get(MessageTopicTable, {
          topic: topic,
        });
        if (rows.length < 1) {
          return;
        }
        await ctx.database.set(MessageTopicTable, rows[0].id, (row) => ({
          producer_quantity: $.if(
            $.gt(row.producer_quantity, 0),
            $.subtract(row.producer_quantity, 1),
            0,
          ),
          update_at: new Date(),
        }));
      },
    });
  },
  async topicSubscribe(ctx: Context, form: TopicSubscribeForm) {
    await LockUtil.synchronized({
      key: `MessageTopicService.topicSubscribe.${form.platform}-${form.channel_id}-${form.binding_key}`,
      fn: async () => {
        const rows = await ctx.database.get(MessageTopicSubscribeTable, {
          platform: form.platform,
          channel_id: form.channel_id,
          binding_key: form.binding_key,
        });
        const date = new Date();
        if (rows.length < 1) {
          await ctx.database.create(MessageTopicSubscribeTable, {
            ...form,
            create_at: date,
            update_at: date,
          });
          return;
        }
        await ctx.database.set(MessageTopicSubscribeTable, rows[0].id, () => ({
          self_id: form.self_id,
          enable: form.enable,
          update_at: date,
        }));
      },
    });
  },
  async getTopicSubscribeByTopic(ctx: Context, topic: string) {
    const rows = await ctx.database.get(
      MessageTopicSubscribeTable,
      {
        enable: true,
      },
      ["id", "platform", "self_id", "channel_id", "binding_key"],
    );
    return rows.filter((row) => {
      let bindingKey = row.binding_key;
      if (!bindingKey || bindingKey.length < 1) {
        return false;
      }
      if (topic === bindingKey) {
        return true;
      }
      bindingKey = bindingKey
        .replace(/\.+/g, ".")
        .replace(/(^|\.)#(\.#)+/g, "$1#");
      if (bindingKey === "#") {
        return true;
      }
      return new RegExp(
        "^" +
          bindingKey
            .split(".")
            .map((item) => {
              switch (item) {
                case "#": {
                  return "([^.]+(\\.|$))*";
                }
                case "*": {
                  return "([^.]+(\\.|$))";
                }
                default: {
                  return (
                    item.replace(/([\^$*+!\\.|{}\[\]()])/g, "\\$1") + "(\\.|$)"
                  );
                }
              }
            })
            .join("") +
          "$",
        "i",
      ).test(topic);
    });
  },
  async getTopicSubscribeByChannel(
    ctx: Context,
    platform: string,
    channelId: string,
  ) {
    return await ctx.database.get(MessageTopicSubscribeTable, {
      platform,
      channel_id: channelId,
      enable: true,
    });
  },
};

export default MessageTopicDao;
