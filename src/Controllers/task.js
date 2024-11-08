const asyncHandler = require('express-async-handler');
const User = require('../Models/Users');
const Task = require('../Models/Tasks');
const Notification = require('../Models/Notification');

const AddTask = asyncHandler(async (req, res) => {

    console.log('/AddTask');
    const { UserID } = req.body.params;

  
    try {
        const { title, description, category, status, dueDate, dependencyOnAnotherTask } = req.query;
        console.log(req.query);

        let givenDueDate = new Date(dueDate);
        if (!title || !description || !(givenDueDate instanceof Date) || !category || !(status == 'Pending' || status == 'In Progress' || status == 'Complete')) {
            return res.status(400).json({ message: 'Invalid Parameters' });
        }
        
    
        const task = new Task({
            ownerID: UserID,
            assignedUserID: UserID,
            title,
            description,
            dueDate: givenDueDate,
            category,
            dependencyOnAnotherTask: dependencyOnAnotherTask || null,
            status
        });

        await task.save();

        res.status(201).json({ message: 'Task created successfully', task });
    } catch (error) {
        res.status(500).json({ message: 'Error creating task', error });
    }
    });

const EditTask = asyncHandler(async (req, res) => {
    console.log("/EditTask")
    const { UserID } = req.body.params;
  
    try {
        const { TaskID, title, description, dueDate, category, dependencyOnAnotherTask, status, assignedUser } = req.query;

          const task = await Task.findById(TaskID);
        if (!task) {
            return res.status(404).json({ message: 'Task not found' });
        }
  
        if (task.ownerID.toString() !== UserID) {
            return res.status(403).json({ message: 'Unauthorized User' });
        }
  
        let givenDueDate = new Date(dueDate);
  
        if (!title || !description || !(givenDueDate instanceof Date) || !category || !(status == 'Pending' || status == 'In Progress' || status == 'Complete')) {
            return res.status(400).json({ message: 'Invalid Parameters' });
        }
        console.log("Checking Owner and Assigned User")
  
        console.log(task.ownerID.toString()+" "+ task.assignedUserID.toString());
  
        task.title = title || task.title;
        task.description = description || task.description;
        task.dueDate = new Date(dueDate) || task.dueDate;
        task.category = category || task.category;
        task.dependencyOnAnotherTask = dependencyOnAnotherTask || task.dependencyOnAnotherTask;
        task.status = status || task.status;
        task.assignedUserID = assignedUser || task.assignedUserID;
  
        await task.save();
  
        if (task.ownerID.toString() == task.assignedUserID.toString()) {
            return res.status(200).json({ message: 'Task updated successfully' });
        } else {
            console.log("Sending Notification")
            await Notification.create({
                receiverID: task.assignedUserID,
                note: `Changed Task in ${task.title}`,
                alertType: 'Task Edit',
                readStatus: 'Unread',
            });
  
            return res.status(200).json({ message: 'Task updated successfully, notification sent to assigned user' });
        }
    } catch (error) {
        return res.status(500).json({ message: 'Error updating task', error });
    }
    });
  
const DeleteTask= asyncHandler(async (req, res) => {
    console.log('/DeleteTask');
    const { UserID } = req.body.params;
  
    try {
      const { TaskID } = req.query;
      const task = await Task.findById(TaskID);
        if (!task) {
            return res.status(404).json({ message: 'Task not found' });
        }
  
        if (task.ownerID.toString() !== UserID) {
            return res.status(403).json({ message: 'Unauthorized User' });
        }
  
        await Task.findByIdAndDelete(TaskID);
  
        if (task.ownerID.toString() == task.assignedUserID.toString()) {
          return res.status(200).json({ message: 'Task Deleted Successfully' });
      } else {
          console.log("Sending Notification")
          await Notification.create({
              receiverID: task.assignedUserID,
              note: `Deleted Task in ${task.title}`,
              alertType: 'Task Delete',
              readStatus: 'Unread',
          });
  
          return res.status(200).json({ message: 'Task Deleted Successfully, Notification Sent To Assigned user' });
      }
  
  
        
    } catch (error) {
        return res.status(500).json({ message: 'Error deleting task', error });
    }
    });
  
const ViewTask = asyncHandler( async (req, res) => {
      console.log('/ViewTask');
      const { UserID } = req.body.params;
  
      try {
          const { TaskID } = req.query;
          const task = await Task.findById(TaskID);
          if (!task) {
              return res.status(404).json({ message: 'Task not found' });
          }
          //Check if Requester is Owner or AssignedUser
          if (task.ownerID.toString() !== UserID && task.assignedUser.toString() !== UserID) {
              return res.status(403).json({ message: 'Unauthorized User' });
          }
  
          return res.status(200).json({ message: 'Task retrieved successfully', task });
      } catch (error) {
          return res.status(500).json({ message: 'Error retrieving task', error });
      }
    });

const AssignTask =  asyncHandler(async (req, res) => {
    console.log("/AssignTask");
    const { UserID } = req.body.params;
    
    
    try {
        // const taskData = req.body.Task;
        // const { AssignedID } = req.body; 
    
        const { AssignedID, title, description, category, dueDate, status } = req.query;
        console.log(req.query);
        let givenDueDate = new Date(dueDate);
        if (!AssignedID || !title || !description || !(givenDueDate instanceof Date) || !category || !(status == 'Pending' || status == 'In Progress' || status == 'Complete')) {
            return res.status(400).json({ message: 'Invalid Parameters' });
        }
    
        const supervisor = await User.findById(UserID);
        if (!supervisor.subordinateList.includes(AssignedID) && UserID.toString() !== AssignedID.toString()) {
            return res.status(400).json({ message: 'User is not a subordinate' });
        }
    
        const task = new Task({
            ownerID: UserID,
            assignedUserID: AssignedID,
            title,
            description,
            dueDate: givenDueDate,
            category,
            status
        });
    
        await task.save();
    
        if (UserID.toString() === AssignedID.toString()) {
            return res.status(200).json({ message: 'Task created and assigned to self successfully' ,task});
    
        } else {
            const notify = new Notification({
                receiverID: AssignedID,
                note: `Assigned New Task - ${title}`,
                alertType: 'Task Assign',
                readStatus: 'Unread'
            });
            await notify.save();
    
            return res.status(200).json({ message: 'Task created and assigned successfully, notification sent to assigned user',task ,notify});
        }
    } catch (error) {
        return res.status(500).json({ message: 'Error creating and assigning task', error });
    }
    });
 
    
const ViewAllTask = asyncHandler( async (req, res) => {
      console.log('/ViewAllTask');
      const { UserID } = req.body.params;
  
      try {
  
          const {
              DueDateAfter = "",
              DueDateBefore = "",
              Category = "",
              Title = "",
              Status = "",
              SortBy = "dueDate",
              SortOrder = "ascending"  
          } = req.query;
      
          const query = {
            $and: [
                { $or: [{ ownerID: UserID }, { assignedUserID: UserID }] }
            ]
          };
  
          if (DueDateAfter) {
              query.$and.push({ dueDate: { $gte: new Date(DueDateAfter) } });
          }
          if (DueDateBefore) {
              query.$and.push({ dueDate: { $lte: new Date(DueDateBefore) } });
          }
          if (Category) {
            let categories = Category.split('*');
            console.log(categories);
              query.$and.push({ category: { $in: categories } });
          }
          if (Title) {
              query.$and.push({ title: { $regex: Title, $options: 'i' } });
          }
          if (Status) {
                statuses = Status.split('*')
                console.log(statuses);
              query.$and.push({ status: { $in: statuses } });
          }
  
          let sortOrder = -1;
          if(SortOrder.toLowerCase()  === 'descending') sortOrder = -1;
          else sortOrder = 1;
          let sortBy = "dueDate";
          if(SortBy !== "dueDate" && SortBy !== "category" && SortBy !== "status" && SortBy != "title") {
              sortBy = "dueDate";
              console.log("SortBy is not supported. Using default sortBy dueDate")
          }
          else sortBy = SortBy;
  
          const tasks = await Task.find(query).sort({[sortBy]: sortOrder})
  
          return res.status(200).json({ message: 'Tasks retrieved successfully', tasks });
      } catch (error) {
            console.log(error);
          return res.status(500).json({ message: 'Error retrieving tasks', error });
      }
    });    
      
const ViewOwnTask = asyncHandler(async (req, res) => {
    console.log('/ViewOwnTask');
    const { UserID } = req.body.params;
    try {
      const {
          DueDateAfter = "",
          DueDateBefore = "",
          Category = "",
          Title = "",
          Status = "",
          SortBy = "dueDate",
          SortOrder = "ascending"  
      } = req.query;
    
    
        const query = {
          $and: [{ ownerID: UserID } ]
        };
  
        if (DueDateAfter) {
            query.$and.push({ dueDate: { $gte: new Date(DueDateAfter) } });
        }
        if (DueDateBefore) {
            query.$and.push({ dueDate: { $lte: new Date(DueDateBefore) } });
        }
        if (Category) {
            let categories = Category.split('*');
            query.$and.push({ category: { $in: categories } });
        }
        if (Title) {
            query.$and.push({ title: { $regex: Title, $options: 'i' } });
        }
        if (Status) {
            statuses = Status.split('*')
            query.$and.push({ status: { $in: statuses } });
        }
  
        let sortOrder = -1;
        if(SortOrder.toLowerCase()  === 'descending') sortOrder = -1;
        else sortOrder = 1;
  
        let sortBy = "dueDate";
        if(SortBy !== "dueDate" && SortBy !== "category" && SortBy !== "status" && SortBy != "title") {
            sortBy = "dueDate";
            console.log("SortBy is not supported. Using default sortBy dueDate")
        }
        else sortBy = SortBy;
  
  
        const tasks = await Task.find(query).sort({[sortBy]: sortOrder})
  
        return res.status(200).json({ message: 'Tasks retrieved successfully', tasks });
    } catch (error) {
        return res.status(500).json({ message: 'Error retrieving tasks', error });
    }
    });
  
const SubordinateViewAssignedTask = asyncHandler( async (req, res) => {
    console.log('/SubordinateViewAssignedTask');
    const { UserID } = req.body.params;
  
    try {
  
      const {
          DueDateAfter = "",
          DueDateBefore = "",
          Category = "",
          Title = "",
          Status = "",
          SortBy = "dueDate",
          SortOrder = "ascending"  
      } = req.query;
    
        const query = {
          $and: [
              { $and: [{ ownerID: { $ne: UserID } }, { assignedUserID: UserID }] }
          ]
        };
  
        if (DueDateAfter) {
            query.$and.push({ dueDate: { $gte: new Date(DueDateAfter) } });
        }
        if (DueDateBefore) {
            query.$and.push({ dueDate: { $lte: new Date(DueDateBefore) } });
        }
        if (Category) {
            let categories = Category.split('*');
            query.$and.push({ category: { $in: categories } });
        }
        if (Title) {
            query.$and.push({ title: { $regex: Title, $options: 'i' } });
        }
        if (Status) {
            statuses = Status.split('*')
            query.$and.push({ status: { $in: statuses } });
        }
  
        let sortOrder = -1;
        if(SortOrder.toLowerCase()  === 'descending') sortOrder = -1;
        else sortOrder = 1;
  
        let sortBy = "dueDate";
        if(SortBy !== "dueDate" && SortBy !== "category" && SortBy !== "status" && SortBy != "title") {
            sortBy = "dueDate";
            console.log("SortBy is not supported. Using default sortBy dueDate")
        }
        else sortBy = SortBy;
  
  
  
        const tasks = await Task.find(query).sort({[sortBy]: sortOrder})
  
        return res.status(200).json({ message: 'Tasks retrieved successfully', tasks });
    } catch (error) {
        return res.status(500).json({ message: 'Error retrieving tasks', error });
    }
    });
  
const SupervisorViewAssignedTask = asyncHandler( async (req, res) => {
    console.log('/SupervisorViewAssignedTask');
    const { UserID } = req.body.params;
  
    try {
      const {
          AssignedID = "",
          DueDateAfter = "",
          DueDateBefore = "",
          Category = "",
          Title = "",
          Status = "",
          SortBy = "dueDate",
          SortOrder = "ascending"  
      } = req.query;
    
  
        const query = {
          $and: [{ ownerID: UserID }, { assignedUserID:{$ne: UserID }}
          ]
        };
  
        if(AssignedID){
          query.$and.push({ assignedUserID: AssignedID });
      }
  
        if (DueDateAfter) {
            query.$and.push({ dueDate: { $gte: new Date(DueDateAfter) } });
        }
        if (DueDateBefore) {
            query.$and.push({ dueDate: { $lte: new Date(DueDateBefore) } });
        }
        if (Category) {
            let categories = Category.split('*');
            query.$and.push({ category: { $in: categories } });
        }
        if (Title) {
            query.$and.push({ title: { $regex: Title, $options: 'i' } });
        }
        if (Status) {
            statuses = Status.split('*')
            query.$and.push({ status: { $in: statuses } });
        }
  
        let sortOrder = -1;
        if(SortOrder.toLowerCase()  === 'descending') sortOrder = -1;
        else sortOrder = 1;
  
        let sortBy = "dueDate";
        if(SortBy !== "dueDate" && SortBy !== "category" && SortBy !== "status" && SortBy != "title") {
            sortBy = "dueDate";
            console.log("SortBy is not supported. Using default sortBy dueDate")
        }
        else sortBy = SortBy;
  
  
  
        const tasks = await Task.find(query).sort({[sortBy]: sortOrder})
  
        return res.status(200).json({ message: 'Tasks retrieved successfully', tasks });
    } catch (error) {
        return res.status(500).json({ message: 'Error retrieving tasks', error });
    }
    });
  
const ChangeTaskStatus = asyncHandler(async (req, res) => {
    console.log("/ChangeTaskStatus");
  
    const { UserID } = req.body.params;
  
    try {
        const { TaskID, Status } = req.query;
        console.log("Debug Point 1");
  
        const task = await Task.findById(TaskID);
        console.log("Debug Point 2");
  
        if (!task) {
            return res.status(404).json({ message: 'Task not found' });
        }
        console.log("Debug Point 3");
  
        if (task.assignedUserID.toString() !== UserID) {
            return res.status(403).json({ message: 'Unauthorized User' });
        }
        console.log("Debug Point 4");
  
        if(Status !== "Pending" && Status !== "In Progress" && Status !== "Complete"){
          return res.status(400).json({ message: 'Invalid Task Status' });
        }
  
        let oldStatus = task.status;
        if (oldStatus === Status) {
          return res.status(400).json({ message: 'No Change In Task Status' });
      }
  
  
        task.status = Status;
        console.log("Debug Point 5");
  
  
        await task.save();
        console.log("Debug Point 6");
  
        if (task.ownerID.toString() === task.assignedUserID.toString()) {
          console.log("Debug Point 7A");
  
            return res.status(200).json({ message: 'Task status updated successfully', task });
            
        } else {
          console.log("Debug Point 7B");
  
          const notify = new Notification({
              receiverID: task.ownerID,
              note: `Changed Task Status in ${task.title} from ${oldStatus} to ${task.status}`,
              alertType: 'Task Status Change',
              readStatus: 'Unread'
          });
          console.log("Debug Point 8");
  
            await notify.save();
            console.log("Debug Point 9");
  
  
            return res.status(200).json({ message: 'Task status updated successfully, notification sent to task owner', task , notify});
        }
    } catch (error) {
        return res.status(500).json({ message: 'Error updating task status', error });
    }
    });
  
const ReassignTask = asyncHandler (async(req,res) => {
      console.log("/ReassignTask");
      const{ UserID } = req.body.params;
      try{
          const {TaskID, AssignedID} = req.query;
  
          const task = await Task.findById(TaskID);
          if ( !task ) {
              return res.status(404).json({ message: 'Task Not Found' });
          }
          if ( task.ownerID.toString() !== UserID.toString()) {
              return res.status(400).json({ message: 'Unautherized Access' });
          }
          
  
          const AssignedUser = await User.findById(AssignedID);
          if (!AssignedUser){
              return res.status(404).json({ message: 'Assigned User not found' });
          }
  
          const supervisor = await User.findById(UserID);
          if (!supervisor.subordinateList.includes(AssignedID) && UserID.toString() !== AssignedID.toString()) {
              return res.status(400).json({ message: 'Assigned User is Not a Subordinate' });
          }
  
          let oldAssignedUser = task.assignedUserID;
          if(oldAssignedUser.toString() === AssignedID.toString()){
              return res.status(400).json({ message: 'There is No Change in Assigned User' });
          }
          console.log("Debug Point 1")
          task.assignedUserID = AssignedID;
          await task.save();
          let title = task.title;
          console.log("Title: \n" + title);
          if(AssignedID.toString() === UserID.toString()){
              console.log("Debug Point 2A")
  
              return res.status(200).json({ message: 'Successfully Changed Assigned User to Owner' });
          }else{
              console.log("Debug Point 2B")
  
              const notify1 = new Notification({
                  receiverID: oldAssignedUser,
                  note: `Dismissed from Task ${title}`,
                  alertType: 'Task Dismiss',
                  readStatus: 'Unread'
              });
              console.log("Debug Point 3")
  
              const notify2 = new Notification({
                  receiverID: AssignedID,
                  note: `Assigned New Task - ${title}`,
                  alertType: 'Task Assign',
                  readStatus: 'Unread'
                });
                console.log("Debug Point 4")
  
                await notify1.save();    
                console.log("Debug Point 5")
   
                await notify2.save();
                console.log("Debug Point 6")
  
                return res.status(200).json({ message: 'Task Reassigned Successfully, Notification sent old and new assigned users', task , notify1, notify2 });
  
  
      
      
  
          }
          
    
  
    
      }catch(err){
          console.log("Error: " + err)
          return res.status(500).json({ message: 'Error Reassigning Task',err})
      }
    });

    module.exports = { 
    AddTask, 
    EditTask, 
    DeleteTask, 
    ViewTask, 
    ViewAllTask, 
    ViewOwnTask, 
    SubordinateViewAssignedTask, 
    SupervisorViewAssignedTask, 
    AssignTask, 
    ChangeTaskStatus, 
    ReassignTask
  };

  
