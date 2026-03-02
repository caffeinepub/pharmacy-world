import Map "mo:core/Map";
import Nat "mo:core/Nat";
import Tex "mo:core/Text";
import Float "mo:core/Float";
import Order "mo:core/Order";
import Runtime "mo:core/Runtime";
import List "mo:core/List";
import Iter "mo:core/Iter";



actor {
  public type SuperAdmin = {
    username : Text;
    password : Text;
  };

  public type Pharmacy = {
    id : Text;
    name : Text;
    address : Text;
    phone : Text;
    createdAt : Text;
    status : Text;
    expiresAt : Text;
  };

  public type Account = {
    id : Text;
    pharmacyId : Text;
    username : Text;
    password : Text;
    fullName : Text;
    role : Text;
    enabled : Bool;
    createdAt : Text;
  };

  public type Medicine = {
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

  public type SaleItem = {
    medicineId : Text;
    medicineName : Text;
    quantity : Nat;
    unitPrice : Float;
    subtotal : Float;
  };

  public type Sale = {
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

  public type PurchaseRecord = {
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

  public type InventoryAdjustmentRecord = {
    pharmacyId : Text;
    medicineId : Text;
    adjustmentAmount : Nat;
    reason : Text;
    adjustedBy : Text;
    timestamp : Text;
    inventoryDifferences : ?Text;
  };

  public type UnauthorizedAccessAttempt = {
    pharmacyId : Text;
    userId : Text;
    resourceAttempted : Text;
    timestamp : Text;
    details : Text;
  };

  public type TransactionRecord = {
    pharmacyId : Text;
    transactionType : Text;
    transactionId : Text;
    amount : Float;
    performedBy : Text;
    timestamp : Text;
    source : Text;
  };

  var superAdmin : ?SuperAdmin = null;

  // Persistent Storage
  let pharmacyIdToPharmacy = Map.empty<Text, Pharmacy>();
  let accountIdToAccountList = Map.empty<Text, List.List<Account>>();
  let medicineIdToMedicineList = Map.empty<Text, List.List<Medicine>>();
  let saleIdToSaleList = Map.empty<Text, List.List<Sale>>();
  let purchaseRecordIdToPurchaseRecordList = Map.empty<Text, List.List<PurchaseRecord>>();
  let inventoryAdjustmentRecords = List.empty<InventoryAdjustmentRecord>();
  let unauthorizedAccessAttempts = List.empty<UnauthorizedAccessAttempt>();
  let transactionRecords = List.empty<TransactionRecord>();

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
    pharmacyIdToPharmacy.values().toArray();
  };

  public shared ({ caller }) func addPharmacy(id : Text, name : Text, address : Text, phone : Text, createdAt : Text) : async () {
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

  public shared ({ caller }) func updatePharmacyStatus(id : Text, status : Text, expiresAt : Text) : async () {
    switch (pharmacyIdToPharmacy.get(id)) {
      case (null) { Runtime.trap("Pharmacy with id " # id # " not found") };
      case (?existing) {
        let updatedPharmacy = { existing with status; expiresAt };
        pharmacyIdToPharmacy.add(id, updatedPharmacy);
      };
    };
  };

  public shared ({ caller }) func deletePharmacy(id : Text) : async () {
    pharmacyIdToPharmacy.remove(id);
  };

  // -- Account Functions --

  func updateAccountList(account : Account) {
    let existingList = switch (accountIdToAccountList.get(account.pharmacyId)) {
      case (null) { List.empty<Account>() };
      case (?list) { list };
    };
    existingList.add(account);
    accountIdToAccountList.add(account.pharmacyId, existingList);
  };

  public query ({ caller }) func getAccounts(pharmacyId : Text) : async [Account] {
    switch (accountIdToAccountList.get(pharmacyId)) {
      case (null) { [] };
      case (?list) { list.toArray() };
    };
  };

  public shared ({ caller }) func addAccount(account : Account) : async () {
    updateAccountList(account);
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
    switch (accountIdToAccountList.get(pharmacyId)) {
      case (null) { Runtime.trap("Account with id " # id # " not found") };
      case (?list) {
        let filteredList = list.filter(func(account) { account.id != id });
        let updatedAccount = {
          id;
          pharmacyId;
          username;
          password;
          fullName;
          role;
          enabled;
          createdAt = "";
        };
        filteredList.add(updatedAccount);
        accountIdToAccountList.add(pharmacyId, filteredList);
      };
    };
  };

  public shared ({ caller }) func deleteAccount(id : Text, pharmacyId : Text) : async () {
    switch (accountIdToAccountList.get(pharmacyId)) {
      case (null) { Runtime.trap("Account with id " # id # " not found") };
      case (?list) {
        let filteredList = list.filter(func(account) { account.id != id });
        accountIdToAccountList.add(pharmacyId, filteredList);
      };
    };
  };

  public query ({ caller }) func verifyAccount(pharmacyId : Text, username : Text, password : Text) : async ?Account {
    switch (accountIdToAccountList.get(pharmacyId)) {
      case (null) { null };
      case (?list) {
        list.find(func(account) { account.username == username and account.password == password and account.enabled });
      };
    };
  };

  // -- Medicine Functions --

  func updateMedicineList(medicine : Medicine) {
    let existingList = switch (medicineIdToMedicineList.get(medicine.pharmacyId)) {
      case (null) { List.empty<Medicine>() };
      case (?list) { list };
    };
    existingList.add(medicine);
    medicineIdToMedicineList.add(medicine.pharmacyId, existingList);
  };

  public query ({ caller }) func getMedicines(pharmacyId : Text) : async [Medicine] {
    switch (medicineIdToMedicineList.get(pharmacyId)) {
      case (null) { [] };
      case (?list) { list.toArray() };
    };
  };

  func categoryCompare(a : Medicine, b : Medicine) : Order.Order {
    Tex.compare(a.category, b.category);
  };

  func priceCompare(a : Medicine, b : Medicine) : Order.Order {
    Float.compare(a.price, b.price);
  };

  func expiryDateCompare(a : Medicine, b : Medicine) : Order.Order {
    Tex.compare(a.expiryDate, b.expiryDate);
  };

  public query ({ caller }) func getMedicinesLowStock(pharmacyId : Text) : async [Medicine] {
    switch (medicineIdToMedicineList.get(pharmacyId)) {
      case (null) { [] };
      case (?list) {
        let lowStock = list.filter(func(med) { med.quantity <= med.lowStockThreshold });
        lowStock.toArray();
      };
    };
  };

  public query ({ caller }) func getMedicinesExpiringSoon(pharmacyId : Text) : async [Medicine] {
    switch (medicineIdToMedicineList.get(pharmacyId)) {
      case (null) { [] };
      case (?list) {
        let sortedList = list.sort(expiryDateCompare);
        sortedList.toArray();
      };
    };
  };

  public query ({ caller }) func getMedicinesByCategory(pharmacyId : Text, category : Text) : async [Medicine] {
    switch (medicineIdToMedicineList.get(pharmacyId)) {
      case (null) { [] };
      case (?list) {
        let filteredList = list.filter(func(med) { med.category == category });
        filteredList.toArray();
      };
    };
  };

  public query ({ caller }) func getMedicinesByPriceRange(pharmacyId : Text, minPrice : Float, maxPrice : Float) : async [Medicine] {
    switch (medicineIdToMedicineList.get(pharmacyId)) {
      case (null) { [] };
      case (?list) {
        let filteredList = list.filter(func(med) { med.price >= minPrice and med.price <= maxPrice });
        filteredList.toArray();
      };
    };
  };

  public shared ({ caller }) func addMedicine(medicine : Medicine) : async () {
    updateMedicineList(medicine);
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
    switch (medicineIdToMedicineList.get(pharmacyId)) {
      case (null) { Runtime.trap("Medicine with id " # id # " not found") };
      case (?list) {
        let filteredList = list.filter(func(medicine) { medicine.id != id });
        let updatedMedicine = {
          id;
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
        filteredList.add(updatedMedicine);
        medicineIdToMedicineList.add(pharmacyId, filteredList);
      };
    };
  };

  public shared ({ caller }) func deleteMedicine(id : Text, pharmacyId : Text) : async () {
    switch (medicineIdToMedicineList.get(pharmacyId)) {
      case (null) { Runtime.trap("Medicine with id " # id # " not found") };
      case (?list) {
        let filteredList = list.filter(func(medicine) { medicine.id != id });
        medicineIdToMedicineList.add(pharmacyId, filteredList);
      };
    };
  };

  public shared ({ caller }) func updateMedicineQuantity(id : Text, pharmacyId : Text, newQuantity : Nat) : async () {
    switch (medicineIdToMedicineList.get(pharmacyId)) {
      case (null) { Runtime.trap("Medicine with id " # id # " not found") };
      case (?list) {
        let filteredList = list.filter(func(medicine) { medicine.id != id });
        let existingMedicine = list.find(func(medicine) { medicine.id == id });
        switch (existingMedicine) {
          case (null) { Runtime.trap("Medicine with id " # id # " not found") };
          case (?existing) {
            let updatedMedicine = { existing with quantity = newQuantity };
            filteredList.add(updatedMedicine);
            medicineIdToMedicineList.add(pharmacyId, filteredList);
          };
        };
      };
    };
  };

  // -- Sale Functions --

  func updateSaleList(sale : Sale) {
    let existingList = switch (saleIdToSaleList.get(sale.pharmacyId)) {
      case (null) { List.empty<Sale>() };
      case (?list) { list };
    };
    existingList.add(sale);
    saleIdToSaleList.add(sale.pharmacyId, existingList);
  };

  public query ({ caller }) func getSales(pharmacyId : Text) : async [Sale] {
    switch (saleIdToSaleList.get(pharmacyId)) {
      case (null) { [] };
      case (?list) { list.toArray() };
    };
  };

  public shared ({ caller }) func addSale(sale : Sale) : async () {
    updateSaleList(sale);
  };

  public shared ({ caller }) func deleteSale(id : Text, pharmacyId : Text) : async ?Sale {
    switch (saleIdToSaleList.get(pharmacyId)) {
      case (null) { Runtime.trap("Sale with id " # id # " not found") };
      case (?list) {
        let filteredList = list.filter(func(sale) { sale.id != id });
        saleIdToSaleList.add(pharmacyId, filteredList);
      };
    };
    null;
  };

  // -- PurchaseRecord Functions --

  func updatePurchaseRecordList(record : PurchaseRecord) {
    let existingList = switch (purchaseRecordIdToPurchaseRecordList.get(record.pharmacyId)) {
      case (null) { List.empty<PurchaseRecord>() };
      case (?list) { list };
    };
    existingList.add(record);
    purchaseRecordIdToPurchaseRecordList.add(record.pharmacyId, existingList);
  };

  public query ({ caller }) func getPurchases(pharmacyId : Text) : async [PurchaseRecord] {
    switch (purchaseRecordIdToPurchaseRecordList.get(pharmacyId)) {
      case (null) { [] };
      case (?list) { list.toArray() };
    };
  };

  public shared ({ caller }) func addPurchase(record : PurchaseRecord) : async () {
    updatePurchaseRecordList(record);
  };

  // -- Miscellaneous Functions --

  public shared ({ caller }) func addInventoryAdjustmentRecord(record : InventoryAdjustmentRecord) : async () {
    inventoryAdjustmentRecords.add(record);
  };

  public query ({ caller }) func getInventoryAdjustmentRecords() : async [InventoryAdjustmentRecord] {
    inventoryAdjustmentRecords.toArray();
  };

  public shared ({ caller }) func addUnauthorizedAccessAttempt(attempt : UnauthorizedAccessAttempt) : async () {
    unauthorizedAccessAttempts.add(attempt);
  };

  public query ({ caller }) func getUnauthorizedAccessAttempts() : async [UnauthorizedAccessAttempt] {
    unauthorizedAccessAttempts.toArray();
  };

  public shared ({ caller }) func addTransactionRecord(record : TransactionRecord) : async () {
    transactionRecords.add(record);
  };

  public query ({ caller }) func getTransactionRecords() : async [TransactionRecord] {
    transactionRecords.toArray();
  };
};
