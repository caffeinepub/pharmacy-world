import Map "mo:core/Map";
import List "mo:core/List";
import Text "mo:core/Text";

module {
  type SuperAdmin = {
    username : Text;
    password : Text;
  };

  type Pharmacy = {
    id : Text;
    name : Text;
    address : Text;
    phone : Text;
    createdAt : Text;
    status : Text;
    expiresAt : Text;
  };

  type Account = {
    id : Text;
    pharmacyId : Text;
    username : Text;
    password : Text;
    fullName : Text;
    role : Text;
    enabled : Bool;
    createdAt : Text;
  };

  type Medicine = {
    id : Text;
    pharmacyId : Text;
    name : Text;
    category : Text;
    price : Float;
    purchasePrice : Float;
    retailPrice : Float;
    quantity : Nat;
    expiryDate : Text;
    manufacturer : Text;
    lowStockThreshold : Nat;
    rackNumber : Text;
  };

  type SaleItem = {
    medicineId : Text;
    medicineName : Text;
    quantity : Nat;
    unitPrice : Float;
    subtotal : Float;
  };

  type Sale = {
    id : Text;
    pharmacyId : Text;
    invoiceNumber : Text;
    date : Text;
    soldBy : Text;
    soldByName : Text;
    items : [SaleItem];
    subtotal : Float;
    discount : Float;
    total : Float;
    patientName : Text;
    patientPhone : Text;
  };

  type PurchaseRecord = {
    id : Text;
    pharmacyId : Text;
    medicineId : Text;
    medicineName : Text;
    date : Text;
    quantity : Nat;
    purchasePrice : Float;
    discountPercent : Float;
    discountAmount : Float;
    netPurchasePrice : Float;
    totalCost : Float;
    addedBy : Text;
    addedByName : Text;
  };

  type InventoryAdjustmentRecord = {
    pharmacyId : Text;
    medicineId : Text;
    adjustmentAmount : Nat;
    reason : Text;
    adjustedBy : Text;
    timestamp : Text;
    inventoryDifferences : ?Text;
  };

  type UnauthorizedAccessAttempt = {
    pharmacyId : Text;
    userId : Text;
    resourceAttempted : Text;
    timestamp : Text;
    details : Text;
  };

  type TransactionRecord = {
    pharmacyId : Text;
    transactionType : Text;
    transactionId : Text;
    amount : Float;
    performedBy : Text;
    timestamp : Text;
    source : Text;
  };

  type OldActor = {
    superAdmin : ?SuperAdmin;
    pharmacyIdToPharmacy : Map.Map<Text, Pharmacy>;
    accountIdToAccountList : Map.Map<Text, List.List<Account>>;
    medicineIdToMedicineList : Map.Map<Text, List.List<Medicine>>;
    saleIdToSaleList : Map.Map<Text, List.List<Sale>>;
    purchaseRecordIdToPurchaseRecordList : Map.Map<Text, List.List<PurchaseRecord>>;
    inventoryAdjustmentRecords : List.List<InventoryAdjustmentRecord>;
    unauthorizedAccessAttempts : List.List<UnauthorizedAccessAttempt>;
    transactionRecords : List.List<TransactionRecord>;
  };

  type NewActor = OldActor;

  public func run(old : OldActor) : NewActor {
    old;
  };
};
