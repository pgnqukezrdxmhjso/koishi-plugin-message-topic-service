import { Context, Fragment, Schema, Service } from "koishi";
import MessageTopicServiceImpl, {
  RegisteredTopicMap,
} from "./MessageTopicServiceImpl";
import { TopicSubscribeForm } from "./MessageTopicDao";

declare module "koishi" {
  interface Context {
    messageTopicService: MessageTopicService;
  }
}

export { RegisteredTopic, RegisteredTopicMap } from "./MessageTopicServiceImpl";
export {
  MessageTopic,
  MessageTopicSubscribe,
  TopicSubscribeForm,
} from "./MessageTopicDao";

const MessageTopicServiceName = "messageTopicService";

class MessageTopicService extends Service {
  _ctx: Context;
  _config: MessageTopicService.Config;

  registeredTopicMap: RegisteredTopicMap = {};

  constructor(ctx: Context, config: MessageTopicService.Config) {
    super(ctx, MessageTopicServiceName);
    this._ctx = ctx;
    this._config = config;
  }

  async start() {
    await MessageTopicServiceImpl.init(this.ctx);
  }

  /**
   * register topic publisher, automatically unregister when the caller disposes
   * <br/>
   * registration is not mandatory, but only statistical
   * @param {string} topic
   */
  async registerTopic(topic: string) {
    return MessageTopicServiceImpl.registerTopic(
      this._ctx,
      this.ctx,
      this.registeredTopicMap,
      topic,
    );
  }

  /**
   * get currently registered topic pusher information
   */
  registerTopicInfo(): RegisteredTopicMap {
    return JSON.parse(JSON.stringify(this.registeredTopicMap));
  }

  /**
   * subscribe to topic messages
   * <br/>
   * matching rules:
   * <br/>
   * topic: msg.a.b.c
   * <br/>
   * bindingKey: msg.*.#
   * <br/>
   * Matches the same string
   * <br/>
   * "*" Can match any string once
   * <br/>
   * "#" Can match zero to unlimited times any string
   * @param {TopicSubscribeForm} form
   */
  async topicSubscribe(form: TopicSubscribeForm) {
    return MessageTopicServiceImpl.topicSubscribe(this._ctx, form);
  }

  /**
   * get the topic subscribed by the channel
   * @param {string} platform
   * @param {string} channelId
   */
  async getTopicSubscribeByChannel(platform: string, channelId: string) {
    return MessageTopicServiceImpl.getTopicSubscribeByChannel(
      this._ctx,
      platform,
      channelId,
    );
  }

  /**
   * get subscribers of a topic
   * @param topic
   */
  async getTopicSubscribeByTopic(topic: string) {
    return MessageTopicServiceImpl.getTopicSubscribeByTopic(this._ctx, topic);
  }

  /**
   * send a topic message
   * @param {string} topic
   * @param {Fragment} msg
   * @param {MessageTopicService.Config} config configuration of overridable service
   */
  async sendMessageToTopic(
    topic: string,
    msg: Fragment,
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
    ignoreTopicMultipleMatches?: boolean;
    sendInterval?: number;
    maxNumberOfResends?: number;
    resendInterval?: number;
    retractTime?: number;
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
    ignoreTopicMultipleMatches: Schema.boolean()
      .default(true)
      .description(
        "Do not send repeatedly when different subscriptions of the same channel are matched at the same time",
      ),
    sendInterval: Schema.number()
      .default(1000)
      .description("same platform message sending interval"),
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
    retractTime: Schema.number()
      .default(0)
      .description("Message retract time(Second,0 is no retract)"),
  });
}

export default MessageTopicService;
