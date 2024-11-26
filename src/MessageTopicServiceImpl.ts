import { Context, Fragment } from "koishi";
import MessageTopicService from "./index";
import MessageTopicDao, { TopicSubscribeForm } from "./MessageTopicDao";

const sleep = async (time: number) =>
  new Promise((resolve) => setTimeout(resolve, time));

export interface RegisteredTopic {
  name: string;
  topics: string[];
}

export interface RegisteredTopicMap {
  [key: string]: RegisteredTopic;
}

const MessageTopicServiceImpl = {
  async init(ctx: Context): Promise<void> {
    MessageTopicDao.initDB(ctx);
    await MessageTopicDao.topicProducerQuantityReturnToZero(ctx);
  },
  async registerTopic(
    ctx: Context,
    sourceCtx: Context,
    registeredTopicMap: RegisteredTopicMap,
    topic: string,
  ) {
    const sourceKey = sourceCtx.scope.uid || sourceCtx.name;
    sourceCtx.on("dispose", () => {
      delete registeredTopicMap[sourceKey];
      return MessageTopicDao.topicAbandon(ctx, topic);
    });
    if (!registeredTopicMap[sourceKey]) {
      registeredTopicMap[sourceKey] = {
        name: sourceCtx.name,
        topics: [],
      };
    }
    registeredTopicMap[sourceKey].topics.push(topic);
    return MessageTopicDao.topicClaim(ctx, topic);
  },
  async topicSubscribe(ctx: Context, form: TopicSubscribeForm) {
    return MessageTopicDao.topicSubscribe(ctx, form);
  },
  async getTopicSubscribeByChannel(
    ctx: Context,
    platform: string,
    channelId: string,
  ) {
    return MessageTopicDao.getTopicSubscribeByChannel(ctx, platform, channelId);
  },
  async getTopicSubscribeByTopic(ctx: Context, topic: string) {
    return await MessageTopicDao.getTopicSubscribeByTopic(ctx, topic);
  },
  async sendMessageToTopic(
    ctx: Context,
    topic: string,
    msg: Fragment,
    ctxConfig: MessageTopicService.Config,
    config: MessageTopicService.Config = {},
  ) {
    config = { ...ctxConfig, ...config };
    if (!topic || topic.length < 1) {
      return;
    }
    if (ctx.bots.length < 1) {
      if (config.ignoreNoBotMatched) {
        return;
      }
      throw new Error("no bot matched");
    }
    const targetList = await MessageTopicDao.getTopicSubscribeByTopic(
      ctx,
      topic,
    );
    if (targetList.length < 1) {
      if (config.ignoreNoSubscribers) {
        return;
      }
      throw new Error("no subscribers");
    }
    let sent = false;
    let sentChannel = [];
    for (const item of targetList) {
      for (let bot of ctx.bots) {
        if (bot.platform !== item.platform) {
          continue;
        }
        if (!config.ignoreSelfIdWhenSending && bot.selfId !== item.self_id) {
          continue;
        }
        if (
          config.ignoreTopicMultipleMatches &&
          sentChannel.includes(item.platform + "-" + item.channel_id)
        ) {
          continue;
        }
        sent = true;
        if (config.ignoreTopicMultipleMatches) {
          sentChannel.push(item.platform + "-" + item.channel_id);
        }
        const _s = async (numberOfRetries: number = 0) => {
          try {
            await bot.sendMessage(item.channel_id, msg);
          } catch (err) {
            ctx.logger.error(err);
            if (numberOfRetries < config.maxNumberOfResends) {
              await sleep(config.resendInterval);
              _s(numberOfRetries + 1).then();
            }
          }
        };
        _s().then();
      }
    }
    if (!sent && !config.ignoreNoBotMatched) {
      throw new Error("no bot matched");
    }
  },
};

export default MessageTopicServiceImpl;
