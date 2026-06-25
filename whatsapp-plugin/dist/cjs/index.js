"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setLogger = exports.Logger = exports.Config = exports.StatusService = exports.FileService = exports.MessageService = exports.ConnectionManager = exports.AuthService = exports.MockGatewayAdapter = exports.HttpGatewayAdapter = exports.OpenClawGatewayAdapter = exports.WhatsAppPlugin = void 0;
var WhatsAppClient_1 = require("./core/WhatsAppClient");
Object.defineProperty(exports, "WhatsAppPlugin", { enumerable: true, get: function () { return WhatsAppClient_1.WhatsAppPlugin; } });
var OpenClawGatewayAdapter_1 = require("./core/OpenClawGatewayAdapter");
Object.defineProperty(exports, "OpenClawGatewayAdapter", { enumerable: true, get: function () { return OpenClawGatewayAdapter_1.OpenClawGatewayAdapter; } });
var HttpGatewayAdapter_1 = require("./core/HttpGatewayAdapter");
Object.defineProperty(exports, "HttpGatewayAdapter", { enumerable: true, get: function () { return HttpGatewayAdapter_1.HttpGatewayAdapter; } });
var MockGatewayAdapter_1 = require("./core/MockGatewayAdapter");
Object.defineProperty(exports, "MockGatewayAdapter", { enumerable: true, get: function () { return MockGatewayAdapter_1.MockGatewayAdapter; } });
// Export individual services for advanced usage
var AuthService_1 = require("./services/AuthService");
Object.defineProperty(exports, "AuthService", { enumerable: true, get: function () { return AuthService_1.AuthService; } });
var ConnectionManager_1 = require("./services/ConnectionManager");
Object.defineProperty(exports, "ConnectionManager", { enumerable: true, get: function () { return ConnectionManager_1.ConnectionManager; } });
var MessageService_1 = require("./services/MessageService");
Object.defineProperty(exports, "MessageService", { enumerable: true, get: function () { return MessageService_1.MessageService; } });
var FileService_1 = require("./services/FileService");
Object.defineProperty(exports, "FileService", { enumerable: true, get: function () { return FileService_1.FileService; } });
var StatusService_1 = require("./services/StatusService");
Object.defineProperty(exports, "StatusService", { enumerable: true, get: function () { return StatusService_1.StatusService; } });
var Config_1 = require("./config/Config");
Object.defineProperty(exports, "Config", { enumerable: true, get: function () { return Config_1.Config; } });
var logger_1 = require("./utils/logger");
Object.defineProperty(exports, "Logger", { enumerable: true, get: function () { return logger_1.Logger; } });
Object.defineProperty(exports, "setLogger", { enumerable: true, get: function () { return logger_1.setLogger; } });
//# sourceMappingURL=index.js.map