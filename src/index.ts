import { Context, Schema, Service } from "koishi";
import MessageTopicServiceImpl from "./MessageTopicServiceImpl";
import { TopicSubscribeForm } from "./MessageTopicDao";

declare module "koishi" {
  interface Context {
    messageTopicService: MessageTopicService;
  }
}
const MessageTopicServiceName = "messageTopicService";

class MessageTopicService extends Service {
  _ctx: Context;
  _config: MessageTopicService.Config;

  registeredTopic = {};

  constructor(ctx: Context, config: MessageTopicService.Config) {
    super(ctx, MessageTopicServiceName);
    this._ctx = ctx;
    this._config = config;
  }

  async start() {
    await MessageTopicServiceImpl.init(this.ctx);
  }

  async registerTopic(topic: string) {
    return MessageTopicServiceImpl.registerTopic(
      this._ctx,
      this.ctx,
      this.registeredTopic,
      topic,
    );
  }

  registerTopicInfo() {
    return JSON.parse(JSON.stringify(this.registeredTopic));
  }

  async topicSubscribe(form: TopicSubscribeForm) {
    return MessageTopicServiceImpl.topicSubscribe(this._ctx, form);
  }

  async getTopicSubscribeByChannel(platform: string, channelId: string) {
    return MessageTopicServiceImpl.getTopicSubscribeByChannel(
      this._ctx,
      platform,
      channelId,
    );
  }

  async sendMessageToTopic(
    topic: string,
    msg: string,
    config?: MessageTopicService.Config,
  ) {
    return MessageTopicServiceImpl.sendMessageToTopic(
      this._ctx,
      topic,
      msg,
      this._config,
      config,
    );
  }
}

namespace MessageTopicService {
  export const inject = ["database"];

  export interface Config {
    ignoreSelfIdWhenSending?: boolean;
    ignoreNoBotMatched?: boolean;
    ignoreNoSubscribers?: boolean;
    maxNumberOfResends?: number;
    resendInterval?: number;
  }

  export const Config: Schema<Config> = Schema.object({
    ignoreSelfIdWhenSending: Schema.boolean()
      .default(true)
      .description(
        "Ignore bot id when sending messages. Other bots in the same channel can also send messages to which other bots subscribe",
      ),
    ignoreNoBotMatched: Schema.boolean()
      .default(true)
      .description(
        "Sending a message without matching any bots does not throw an exception",
      ),
    ignoreNoSubscribers: Schema.boolean()
      .default(true)
      .description(
        "Sending a message without no subscribers does not throw an exception",
      ),
    maxNumberOfResends: Schema.number()
      .default(2)
      .description(
        "The maximum number of retries when a message fails to be sent",
      ),
    resendInterval: Schema.number()
      .default(3000)
      .description(
        "The interval between retries when a message fails to be sent",
      ),
  });
}

export default MessageTopicService;
