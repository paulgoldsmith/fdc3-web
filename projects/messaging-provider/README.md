# FDC3 Messaging Provider Plugin

The FDC3 Messaging Provider plugin is a library used to facilitate low-level communications between HTML5 windows and iFrames used as a plugin to the main `@morgan-stanley/fdc3-web` library. It provides two types of messaging providers: the Root Window Messaging Provider and the iFrame Messaging Provider.

## Root Window Messaging Provider

The Root Window Messaging Provider is designed to be used in the main application window. It allows for communication between the main window and any child windows or iFrames.

To use the Root Window Messaging Provider, follow these steps:

Import the messaging provider module and pass the `rootWindowMessagingProviderFactory` to the `DesktopAgentFactory.createRoot` function:

```javascript
import { DesktopAgentFactory } from '@morgan-stanley/fdc3-web';
import { rootWindowMessagingProviderFactory } from '@morgan-stanley/fdc3-web-messaging-provider';

const desktopAgentFactory = new DesktopAgentFactory();

// If in the root window of the application create the Root Desktop Agent
const fdc3 = desktopAgentFactory.createRoot('my-application', rootWindowMessagingProviderFactory)
```

## iFrame Messaging Provider

The iFrame Messaging Provider is designed to be used in windows that are children of the main application. It allows for communication between the iFrame and the main window.

To use the iFrame Messaging Provider, follow these steps:

Import the messaging provider module and pass the `iframeMessagingProviderFactory` to the `DesktopAgentFactory.createProxy` function:

```typescript
import { DesktopAgentFactory } from '@morgan-stanley/fdc3-web';
import { iframeMessagingProviderFactory } from '@morgan-stanley/fdc3-web-messaging-provider';

const desktopAgentFactory = new DesktopAgentFactory();

// If in the child window or frame of the application create a Proxy Desktop Agent
const fdc3 = desktopAgentFactory.createProxy('my-child-application', iframeMessagingProviderFactory)
```
