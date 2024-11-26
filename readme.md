# koishi-plugin-message-topic-service

[![npm](https://img.shields.io/npm/v/koishi-plugin-message-topic-service?style=flat-square)](https://www.npmjs.com/package/koishi-plugin-message-topic-service)

[usage example](https://github.com/pgnqukezrdxmhjso/koishi-plugin-message-topic)

---

## how to use

in your plugin directory run

```
yarn add -D koishi-plugin-message-topic-service@latest
```

in your plugin `package.json` file add

```
  "koishi": {
    "service": {
      "required": [
        "messageTopicService"
      ]
    }
  }
```

in your plugin `index.ts` file add

```
export const inject = ["messageTopicService"];
```

---

### how to call a service



```
/**
 * register topic publisher, automatically unregister when the caller disposes
 * registration is not mandatory, but only statistical
 */
await ctx.messageTopicService.registerTopic(topic);
```

```
/**
 * get currently registered topic pusher information
 */
const info = ctx.messageTopicService.registerTopicInfo();
```

```
/**
 * subscribe to topic messages
 * matching rules:
 * topic: msg.a.b.c
 * bindingKey: msg.*.#
 * Matches the same string
 * "*" Can match any string once
 * "#" Can match zero to unlimited times any string
 */
await ctx.messageTopicService.topicSubscribe({
  platform: session.bot.platform,
  selfId: session.bot.selfId,
  channelId: session.channelId,
  bindingKey: bindingKey,
  enable: true,
});
```

```
/**
 * get the topic subscribed by the channel
 */
const rows = await ctx.messageTopicService.getTopicSubscribeByChannel(
  session.bot.platform,
  session.channelId,
);
```

```
/**
 * get subscribers of a topic
 */
const rows = await ctx.messageTopicService.getTopicSubscribeByTopic(topic);
```

```
/**
 * send a topic message
 * @param {string} topic
 * @param {string} msg
 * @param {MessageTopicService.Config} config configuration of overridable service
 */
await ctx.messageTopicService.sendMessageToTopic(topic, msg);
```