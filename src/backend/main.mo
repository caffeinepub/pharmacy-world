import Text "mo:core/Text";

actor {
  public query ({ caller }) func ping() : async Text {
    "pong";
  };
};
