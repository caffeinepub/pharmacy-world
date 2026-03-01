import Array "mo:core/Array";
import Text "mo:core/Text";
import Float "mo:core/Float";
import Map "mo:core/Map";
import Time "mo:core/Time";
import Migration "migration";
import Runtime "mo:core/Runtime";

(with migration = Migration.run)
actor {
  // -- Types --
  type SuperAdmin = {
    username : Text;
    password : Text; // Store plain text passwords for simplicity
  };

  type Pharmacy = {
    id : Text;
    name : Text;
    address : Text;
    phone : Text;
    createdAt : Text;
    status : Text; // "active" | "inactive"
    expiresAt : Text; // ISO string or "" for no expiry
  };

  type Account = {
    id : Text;
    pharmacyId : Text;
    username : Text;
    password : Text; // Store plain text passwords for simplicity
    fullName : Text;
    role : Text; // "admin" | "client"
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

  // -- Persistent Storage --
  var superAdmin : ?SuperAdmin = null;
  let pharmacyIdToPharmacy = Map.empty<Text, Pharmacy>();
  let accountIdToAccount = Map.empty<Text, Account>();
  let medicineIdToMedicine = Map.empty<Text, Medicine>();
  let saleIdToSale = Map.empty<Text, Sale>();
  let purchaseRecordIdToPurchaseRecord = Map.empty<Text, PurchaseRecord>();

  // -- SuperAdmin Functions --

  public query ({ caller }) func getSuperAdmin() : async ?SuperAdmin {
    superAdmin;
  };

  public shared ({ caller }) func verifySuperAdmin(username : Text, password : Text) : async Bool {
    switch (superAdmin) {
      case (null) { false };
      case (?admin) { admin.username == username and admin.password == password };
    };
  };

  public shared ({ caller }) func changeSuperAdminPassword(oldPassword : Text, newPassword : Text) : async Bool {
    switch (superAdmin) {
      case (null) { false };
      case (?admin) {
        if (admin.password == oldPassword) {
          superAdmin := ?{ admin with password = newPassword };
          true;
        } else {
          false;
        };
      };
    };
  };

  public shared ({ caller }) func setupSuperAdmin(username : Text, password : Text) : async Bool {
    switch (superAdmin) {
      case (null) {
        superAdmin := ?{ username; password };
        true;
      };
      case (_) { false };
    };
  };

  // -- Pharmacy Functions --

  public query ({ caller }) func getPharmacies() : async [Pharmacy] {
    pharmacyIdToPharmacy.toArray().map(func((_, pharmacy)) { pharmacy });
  };

  public shared ({ caller }) func addPharmacy(
    id : Text,
    name : Text,
    address : Text,
    phone : Text,
    createdAt : Text,
  ) : async () {
    let newPharmacy : Pharmacy = {
      id;
      name;
      address;
      phone;
      createdAt;
      status = "active";
      expiresAt = "";
    };
    pharmacyIdToPharmacy.add(id, newPharmacy);
  };

  public shared ({ caller }) func updatePharmacyStatus(
    id : Text,
    status : Text,
    expiresAt : Text,
  ) : async () {
    switch (pharmacyIdToPharmacy.get(id)) {
      case (null) { Runtime.trap("Pharmacy with id " # id # " not found"); };
      case (?existing) {
        let updatedPharmacy = {
          existing with
          status;
          expiresAt;
        };
        pharmacyIdToPharmacy.add(id, updatedPharmacy);
      };
    };
  };

  public shared ({ caller }) func deletePharmacy(id : Text) : async () {
    pharmacyIdToPharmacy.remove(id);
  };

  // -- Account Functions --

  public query ({ caller }) func getAccounts(pharmacyId : Text) : async [Account] {
    accountIdToAccount.toArray().map(func((_, account)) { account }).filter(func(account) { account.pharmacyId == pharmacyId });
  };

  public shared ({ caller }) func addAccount(account : Account) : async () {
    accountIdToAccount.add(account.id, account);
  };

  public shared ({ caller }) func updateAccount(
    id : Text,
    pharmacyId : Text,
    username : Text,
    password : Text,
    fullName : Text,
    role : Text,
    enabled : Bool,
  ) : async () {
    switch (accountIdToAccount.get(id)) {
      case (null) { Runtime.trap("Account with id " # id # " not found"); };
      case (?existing) {
        let updatedAccount = {
          existing with
          pharmacyId;
          username;
          password;
          fullName;
          role;
          enabled;
        };
        accountIdToAccount.add(id, updatedAccount);
      };
    };
  };

  public shared ({ caller }) func deleteAccount(id : Text, pharmacyId : Text) : async () {
    switch (accountIdToAccount.get(id)) {
      case (null) { Runtime.trap("Account with id " # id # " not found"); };
      case (?account) {
        if (account.pharmacyId != pharmacyId) {
          Runtime.trap("Pharmacy id mismatch for account " # id);
        };
        accountIdToAccount.remove(id);
      };
    };
  };

  public query ({ caller }) func verifyAccount(pharmacyId : Text, username : Text, password : Text) : async ?Account {
    let matching = accountIdToAccount.toArray().map(func((_, account)) { account }).find(
      func(account) {
        account.pharmacyId == pharmacyId and account.username == username and account.password == password and account.enabled
      }
    );
    matching;
  };

  // -- Medicine Functions --

  public query ({ caller }) func getMedicines(pharmacyId : Text) : async [Medicine] {
    medicineIdToMedicine.toArray().map(func((_, medicine)) { medicine }).filter(func(medicine) { medicine.pharmacyId == pharmacyId });
  };

  public shared ({ caller }) func addMedicine(medicine : Medicine) : async () {
    medicineIdToMedicine.add(medicine.id, medicine);
  };

  public shared ({ caller }) func updateMedicine(
    id : Text,
    pharmacyId : Text,
    name : Text,
    category : Text,
    price : Float,
    purchasePrice : Float,
    retailPrice : Float,
    quantity : Nat,
    expiryDate : Text,
    manufacturer : Text,
    lowStockThreshold : Nat,
    rackNumber : Text,
  ) : async () {
    switch (medicineIdToMedicine.get(id)) {
      case (null) { Runtime.trap("Medicine with id " # id # " not found"); };
      case (?existing) {
        let updatedMedicine = {
          existing with
          pharmacyId;
          name;
          category;
          price;
          purchasePrice;
          retailPrice;
          quantity;
          expiryDate;
          manufacturer;
          lowStockThreshold;
          rackNumber;
        };
        medicineIdToMedicine.add(id, updatedMedicine);
      };
    };
  };

  public shared ({ caller }) func deleteMedicine(id : Text, pharmacyId : Text) : async () {
    switch (medicineIdToMedicine.get(id)) {
      case (null) { Runtime.trap("Medicine with id " # id # " not found"); };
      case (?medicine) {
        if (medicine.pharmacyId != pharmacyId) {
          Runtime.trap("Pharmacy id mismatch for medicine " # id);
        };
        medicineIdToMedicine.remove(id);
      };
    };
  };

  public shared ({ caller }) func updateMedicineQuantity(id : Text, pharmacyId : Text, newQuantity : Nat) : async () {
    switch (medicineIdToMedicine.get(id)) {
      case (null) { Runtime.trap("Medicine with id " # id # " not found"); };
      case (?medicine) {
        if (medicine.pharmacyId != pharmacyId) {
          Runtime.trap("Pharmacy id mismatch for medicine " # id);
        };
        let updatedMedicine = {
          medicine with quantity = newQuantity
        };
        medicineIdToMedicine.add(id, updatedMedicine);
      };
    };
  };

  // -- Sale Functions --

  public query ({ caller }) func getSales(pharmacyId : Text) : async [Sale] {
    saleIdToSale.toArray().map(func((_, sale)) { sale }).filter(func(sale) { sale.pharmacyId == pharmacyId });
  };

  public shared ({ caller }) func addSale(sale : Sale) : async () {
    saleIdToSale.add(sale.id, sale);
  };

  public shared ({ caller }) func deleteSale(id : Text, pharmacyId : Text) : async ?Sale {
    switch (saleIdToSale.get(id)) {
      case (null) { Runtime.trap("Sale with id " # id # " not found"); };
      case (?sale) {
        if (sale.pharmacyId != pharmacyId) {
          Runtime.trap("Pharmacy id mismatch for sale " # id);
        };
        saleIdToSale.remove(id);
        ?sale;
      };
    };
  };

  // -- PurchaseRecord Functions --

  public query ({ caller }) func getPurchases(pharmacyId : Text) : async [PurchaseRecord] {
    purchaseRecordIdToPurchaseRecord.toArray().map(func((_, record)) { record }).filter(func(record) { record.pharmacyId == pharmacyId });
  };

  public shared ({ caller }) func addPurchase(record : PurchaseRecord) : async () {
    purchaseRecordIdToPurchaseRecord.add(record.id, record);
  };
};
