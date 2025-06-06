"use strict";
// One-time script to assign random stats to all users without stats
// Usage: run with ts-node or node (after transpile)
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var supabase_js_1 = require("@supabase/supabase-js");
var dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config({ path: '../.env.local' });
var supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
var supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;
if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase credentials');
}
var supabase = (0, supabase_js_1.createClient)(supabaseUrl, supabaseKey);
function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}
function getRandomDateWithinMonths(months) {
    var now = new Date();
    var past = new Date(now.getTime() - getRandomInt(0, months * 30 * 24 * 60 * 60 * 1000));
    return past.toISOString();
}
function main() {
    return __awaiter(this, void 0, void 0, function () {
        var table, xpField, accField, gamesField, lastPlayedField, _a, users, error, updates, _i, updates_1, update, updateError;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    table = 'profiles';
                    xpField = 'global_xp';
                    accField = 'accuracy_percent';
                    gamesField = 'games_played';
                    lastPlayedField = 'last_played';
                    return [4 /*yield*/, supabase
                            .from(table)
                            .select('id, ' + xpField + ', ' + accField + ', ' + gamesField + ', ' + lastPlayedField)
                            .or("".concat(xpField, ".is.null,").concat(xpField, ".eq.0"))];
                case 1:
                    _a = _b.sent(), users = _a.data, error = _a.error;
                    if (error)
                        throw error;
                    if (!users || users.length === 0) {
                        console.log('No users found needing stat seeding.');
                        return [2 /*return*/];
                    }
                    updates = users.map(function (user) {
                        var _a;
                        return (_a = {
                                id: user.id
                            },
                            _a[xpField] = getRandomInt(100, 10000),
                            _a[accField] = getRandomInt(50, 100),
                            _a[gamesField] = getRandomInt(1, 50),
                            _a[lastPlayedField] = getRandomDateWithinMonths(6),
                            _a);
                    });
                    _i = 0, updates_1 = updates;
                    _b.label = 2;
                case 2:
                    if (!(_i < updates_1.length)) return [3 /*break*/, 5];
                    update = updates_1[_i];
                    return [4 /*yield*/, supabase.from(table).update(update).eq('id', update.id)];
                case 3:
                    updateError = (_b.sent()).error;
                    if (updateError) {
                        console.error("Failed to update user ".concat(update.id, ":"), updateError.message);
                    }
                    else {
                        console.log("Seeded stats for user ".concat(update.id));
                    }
                    _b.label = 4;
                case 4:
                    _i++;
                    return [3 /*break*/, 2];
                case 5:
                    console.log('Seeding complete.');
                    return [2 /*return*/];
            }
        });
    });
}
main().catch(function (e) {
    console.error('Script failed:', e);
    process.exit(1);
});
