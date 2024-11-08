const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const User = require('./Models/Users');
const Task = require('./Models/Tasks');
const LoggedIn = require('./Models/LoggedIn'); 
const Notification = require('./Models/Notification');
const NotificationPreference = require('./Models/NotificationPreference');

const app  = express();
app.use(cors());
app.use(express.json());

const JWT_SECRET = 'taskSchedulerAppSecretKey';


mongoose.connect('mongodb://localhost:27017/taskScheduler')
.then(() => console.log("MongoDB connected"))
.catch(err => console.log("Failed to connect to MongoDB:", err));

app.post("/UserRegistration", async (req, res) => {
    console.log("/UserRegistration");
    try {

        const { userName, password, confirmPassword, userRole } = req.body;
        console.log(userName, password, confirmPassword, userRole);

        const existingUser = await User.findOne({ userName });
        if (existingUser) {
            return res.status(400).json({ message: 'Username already exists' });
        }

        if (password.length < 8 || password !== confirmPassword) {
            return res.status(400).json({ message: 'Password must be at least 8 characters and match the confirmation password' });
        }
        if (userRole != 'Subordinate' && userRole != 'Supervisor'){
        return res.status(400).json({ message: 'Wrong UserRole' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = new User({
            userName,
            userPassword: hashedPassword,
            userRole,
            subordinateList: [],
            supervisorList: []
        });

        await newUser.save();
        res.status(201).json({ message: 'User registered successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error registering user', error });
    }
});


app.post("/UserLogin", async (req, res) => {
    console.log("/UserLogin");
    try{
        const { userName, password } = req.body;

        const user = await User.findOne({ userName });
        if (!user) {
            return res.status(400).json({ message: 'Wrong Username or Password' });
        }

        const isMatch = await bcrypt.compare(password, user.userPassword);
        if (!isMatch) {
            return res.status(400).json({ message: 'Wrong Username or Password' });
        }

        const token = jwt.sign(
            { id: user._id, userName: user.userName, userRole: user.userRole },
            JWT_SECRET,
            { expiresIn: '1d' } 
        );

        const loggedInUser = new LoggedIn({ userId: user._id });
        await loggedInUser.save();

        res.status(200).json({ message: 'Login successful', token });
    } catch (error) {
        res.status(500).json({ message: 'Error Logging In user', error });
    }

});


const SupervisorMiddleware = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            return res.status(403).json({ message: 'Invalid JWT Token' });
        }
        
        const decoded = jwt.verify(token, JWT_SECRET);
        const { id, userName, userRole } = decoded;

        if (userRole !== 'Supervisor') {
            return res.status(403).json({ message: 'Wrong UserType' });
        }

        const isLoggedIn = await LoggedIn.findOne({ userId: id });
        if (!isLoggedIn) {
            return res.status(403).json({ message: 'Unauthorized User' });
        }

        req.body.params = { UserID: id, UserName: userName, UserRole: userRole };
        next();
    } catch (error) {
        return res.status(403).json({ message: 'Invalid JWT Token' });
    }
};

const UserMiddleware = async (req, res, next) => {
  try {
      const token = req.headers.authorization?.split(' ')[1];
      if (!token) {
          return res.status(403).json({ message: 'Invalid JWT Token' });
      }
      
      const decoded = jwt.verify(token, JWT_SECRET);
      const { id, userName, userRole } = decoded;
      console.log(id, userName, userRole);

      const isLoggedIn = await LoggedIn.findOne({ userId: id });
      if (!isLoggedIn) {
          return res.status(403).json({ message: 'Unauthorized User' });
      }

      req.body.params = { UserID: id, UserName: userName, UserRole: userRole };
      next();
  } catch (error) {
      return res.status(403).json({ message: 'Invalid JWT Token' });
  }
};

app.get('/UserLogout', UserMiddleware, async (req, res) => {
    console.log('/UserLogout');
  const { UserID } = req.body.params;

  try {
      await LoggedIn.deleteMany({ userId: UserID });

      return res.status(200).json({ message: "Logged Out Successfully" });
  } catch (error) {
      return res.status(500).json({ message: "Error logging out", error });
  }
});

//Users

app.get('/ViewAllSubordinates', SupervisorMiddleware, async (req, res) => {
  console.log("/ViewAllSubordinates")
  try {
      const subordinates = await User.find({ userRole: 'Subordinate' });
      
      res.status(200).json(subordinates.map(subordinate => [subordinate._id, subordinate.userName]));
  } catch (error) {
      res.status(500).json({ message: 'Error retrieving subordinates', error });
  }
});

app.post('/AddSubordinate', SupervisorMiddleware, async (req, res) => {
    console.log('/AddSubordinate');
  const { UserID } = req.body.params;

  try {
    const { SubordinateID } = req.body;
    const subordinate = await User.findById(SubordinateID);
      if (!subordinate) {
          return res.status(404).json({ message: 'No such user exists' });
      }

      const supervisor = await User.findById(UserID);
      if (supervisor.subordinateList.includes(SubordinateID)) {
          return res.status(400).json({ message: 'User is already a subordinate' });
      }

      supervisor.subordinateList.push(SubordinateID);
      subordinate.supervisorList.push(UserID);

      await supervisor.save();
      await subordinate.save();
      
      const notify = new Notification({
        receiverID: SubordinateID,
        note: `You Have a New Supervisor - ${supervisor.userName}`,
        alertType: 'New Supervisor',
        readStatus: 'Unread'
      });
      notify.save();


      res.status(200).json({ message: 'Subordinate added successfully' });
  } catch (error) {
      res.status(500).json({ message: 'Error adding subordinate', error });
  }
});

app.get('/ViewSubordinateList', SupervisorMiddleware, async (req, res) => {
    console.log('/ViewSubordinateList')
    const { UserID } = req.body.params;

  try {
      const supervisor = await User.findById(UserID);

      if (!supervisor) {
          return res.status(404).json({ message: 'Wrong User' });
      }

      const subordinates = await User.find({ _id: { $in: supervisor.subordinateList } }, 'userName');

      res.status(200).json(subordinates.map(subordinate => ({ ID: subordinate._id, userName: subordinate.userName })));
  } catch (error) {
      res.status(500).json({ message: 'Error retrieving subordinate list', error });
  }
});

app.get('/ViewSupervisorList', UserMiddleware, async (req, res) => {
  console.log('/ViewSupervisorList');
  const { UserID } = req.body.params;

  try {
      const user = await User.findById(UserID);

      if (!user) {
          return res.status(404).json({ message: 'Wrong User' });
      }

      const supervisors = await User.find({ _id: { $in: user.supervisorList } }, 'userName');

      res.status(200).json(supervisors.map(supervisor => ({ ID: supervisor._id, userName: supervisor.userName })));
  } catch (error) {
      res.status(500).json({ message: 'Error retrieving supervisors list', error });
  }
});

app.post('/RemoveSubordinate', SupervisorMiddleware, async (req, res) => {
    console.log('/RemoveSubordinate');
  const { UserID } = req.body.params;

  try {
    const { SubordinateID } = req.body;
    const supervisor = await User.findById(UserID);
      if (!supervisor.subordinateList.includes(SubordinateID)) {
          return res.status(404).json({ message: 'No such subordinate' });
      }

      supervisor.subordinateList = supervisor.subordinateList.filter(id => id.toString() !== SubordinateID);

      const subordinate = await User.findById(SubordinateID);
      subordinate.supervisorList = subordinate.supervisorList.filter(id => id.toString() !== UserID);

      await supervisor.save();
      await subordinate.save();

      const notify = new Notification({
        receiverID: SubordinateID,
        note: `Your Supervisor Has been Removed - ${supervisor.userName}`,
        alertType: 'Removed Supervisor',
        readStatus: 'Unread'
      });
      notify.save();


      res.status(200).json({ message: 'Subordinate removed successfully' });
  } catch (error) {
      res.status(500).json({ message: 'Error removing subordinate', error });
  }
});


//Task

app.post('/AddTask', UserMiddleware, async (req, res) => {

  console.log('/AddTask');
//   const { UserID } = req.body.params;


  try {
    // const taskData = req.body.Task;

    // const { title, description, category, status } = taskData;
    const { UserID, title, description, category, status, dueDate, dependencyOnAnotherTask } = req.query;
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

app.post('/EditTask', UserMiddleware, async (req, res) => {
  console.log("/EditTask")
  const { UserID } = req.body.params;

  try {
        const { TaskID } = req.body;
        const taskData = req.body.Task;
        const task = await Task.findById(TaskID);
      if (!task) {
          return res.status(404).json({ message: 'Task not found' });
      }

      if (task.ownerID.toString() !== UserID) {
          return res.status(403).json({ message: 'Unauthorized User' });
      }

      const { title, description, category, status, assignedUser } = taskData;
      let dueDate = new Date(taskData.dueDate);

      if (!title || !description || !(dueDate instanceof Date) || !category || !(status == 'Pending' || status == 'In Progress' || status == 'Complete')) {
          return res.status(400).json({ message: 'Invalid Parameters' });
      }
      console.log("Checking Owner and Assigned User")

      console.log(task.ownerID.toString()+" "+ task.assignedUserID.toString());

      task.title = title;
      task.description = description;
      task.dueDate = new Date(dueDate);
      task.category = category;
      task.status = status;
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

app.post('/DeleteTask', UserMiddleware, async (req, res) => {
  console.log('/DeleteTask');
  const { UserID } = req.body.params;

  try {
    const { TaskID } = req.body;
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

app.post('/ViewTask', UserMiddleware, async (req, res) => {
    console.log('/ViewTask');
    const { UserID } = req.body.params;

    try {
        const { TaskID } = req.body;
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

app.post('/ViewAllTask', UserMiddleware, async (req, res) => {
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
        } = req.body;
    
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
            query.$and.push({ category: { $in: JSON.parse(Category) } });
        }
        if (Title) {
            query.$and.push({ title: { $regex: Title, $options: 'i' } });
        }
        if (Status) {
            query.$and.push({ status: { $in: JSON.parse(Status) } });
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

app.post('/ViewOwnTask', UserMiddleware, async (req, res) => {
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
    } = req.body;
  
  
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
          query.$and.push({ category: { $in: JSON.parse(Category) } });
      }
      if (Title) {
          query.$and.push({ title: { $regex: Title, $options: 'i' } });
      }
      if (Status) {
          query.$and.push({ status: { $in: JSON.parse(Status) } });
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

app.post('/SubordinateViewAssignedTask', UserMiddleware, async (req, res) => {
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
    } = req.body;
  
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
          query.$and.push({ category: { $in: JSON.parse(Category) } });
      }
      if (Title) {
          query.$and.push({ title: { $regex: Title, $options: 'i' } });
      }
      if (Status) {
          query.$and.push({ status: { $in: JSON.parse(Status) } });
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

app.post('/SupervisorViewAssignedTask', SupervisorMiddleware, async (req, res) => {
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
    } = req.body;
  

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
          query.$and.push({ category: { $in: JSON.parse(Category) } });
      }
      if (Title) {
          query.$and.push({ title: { $regex: Title, $options: 'i' } });
      }
      if (Status) {
          query.$and.push({ status: { $in: JSON.parse(Status) } });
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

app.post('/AssignTask', SupervisorMiddleware, async (req, res) => {
  console.log("/AssignTask");
  const { UserID } = req.body.params;
  

  try {
    const taskData = req.body.Task;
    const { AssignedID } = req.body; 

    const { title, description, category, status } = taskData;
      let dueDate = new Date(taskData.dueDate);
      if (!AssignedID || !title || !description || !(dueDate instanceof Date) || !category || !(status == 'Pending' || status == 'In Progress' || status == 'Complete')) {
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
          dueDate,
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

app.post('/ChangeTaskStatus', UserMiddleware, async (req, res) => {
  console.log("/ChangeTaskStatus");

  const { UserID } = req.body.params;

  try {
      const { TaskID, Status } = req.body;
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

app.post('/ReassignTask', SupervisorMiddleware, async(req,res) => {
    console.log("/ReassignTask");
    const{ UserID } = req.body.params;
    try{
        const {TaskID, AssignedID} = req.body;

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
})

//Notification

app.get('/GetNotifications', UserMiddleware, async (req, res)=>{
    const { UserID } = req.body.params;
    try{
        const notifications = await Notification.find({ receiverID: UserID }).sort({ readStatus: -1, createdAt: -1 });
        const notificationPreference = await NotificationPreference.find({ UserID: UserID})
        if(!notificationPreference) notificationPreference = null;
        return res.status(200).json({ message: 'Notifications retrieved successfully', notifications, notificationPreference });
    }catch(err){
        console.log("Error: " + err)
        return res.status(500).json({ message: 'Error Retriving Notifications',err})
    }
})

app.get('/GetUnreadNotifications', UserMiddleware, async (req, res)=>{
    const { UserID } = req.body.params;
    try{
        const notifications = await Notification.find({ receiverID: UserID, readStatus: "Unread" }).sort({ createdAt: -1 });
        const notificationPreference = await NotificationPreference.find({ UserID: UserID})
        if(!notificationPreference) notificationPreference = null;
        return res.status(200).json({ message: 'Notifications retrieved successfully', notifications, notificationPreference });
    }catch(err){
        console.log("Error: " + err)
        return res.status(500).json({ message: 'Error Retriving Notifications',err})
    }
})

app.get('/MarkAllNotificationAsRead', UserMiddleware, async (req, res)=>{
    const { UserID } = req.body.params;
    try{
        await Notification.updateMany({ receiverID: UserID, readStatus: "Unread" },{ $set: { readStatus: "Read" } } );
        return res.status(200).json({ message: 'All Notifications Marked As Read' });
    }catch(err){
        console.log("Error: " + err)
        return res.status(500).json({ message: 'Error Marking All Notifications As Read',err})
    }
})

app.post('/MarkNotificationAsRead', UserMiddleware, async (req, res)=>{
    const { UserID } = req.body.params;
    try{
        const { NotificationID } = req.body;
        const notification = await Notification.findById(NotificationID);
        if ( !notification ) {
            return res.status(404).json({ message: 'Notification Not Found' });
        }
        notification.readStatus = "Read";
        notification.save();
        return res.status(200).json({ message: 'Notification Marked As Read', notification });
    }catch(err){
        console.log("Error: " + err)
        return res.status(500).json({ message: 'Error Marking Notification As Read',err})
    }
});

//Notification Preference

app.get('/GetNotificationPreference', UserMiddleware, async (req, res)=>{
    const { UserID } = req.body.params;
    try{
        const notificationPreference = await NotificationPreference.find({ UserID: UserID})
        if(!notificationPreference || notificationPreference.length == 0) {return res.status(404).json({ message: 'You Have No Set Notification Preference' });};
        return res.status(200).json({ message: 'Notification Preference retrieved successfully', notificationPreference });
    }catch(err){
        console.log("Error: " + err)
        return res.status(500).json({ message: 'Error Retriving Notification Preference',err})
    }
});


app.post('/SetNotificationPreference', UserMiddleware, async (req, res) => {
    const { UserID } = req.body.params;
    try {
        const {
            TaskEditNotification,
            TaskStatusChangeNotification,
            TaskAssignNotification,
            TaskDismissNotification,
            TaskDeleteNotification,
            NewSupervisorNotification,
            RemovedSupervisorNotification
        } = req.body;
    
        let notificationPreference = await NotificationPreference.findOne({ UserID: UserID });
        
        if (!notificationPreference) {
            notificationPreference = new NotificationPreference({
                UserID,
                TaskEditNotification : TaskEditNotification || "Default",
                TaskStatusChangeNotification : TaskStatusChangeNotification || "Default",
                TaskAssignNotification : TaskAssignNotification || "Default",
                TaskDismissNotification : TaskDismissNotification || "Default",
                TaskDeleteNotification : TaskDeleteNotification || "Default",
                NewSupervisorNotification : NewSupervisorNotification || "Default",
                RemovedSupervisorNotification : RemovedSupervisorNotification || "Default"
            });
            await notificationPreference.save();
            return res.status(200).json({ message: 'Notification Preference Created Successfully', notificationPreference });
        } else {
            // Update existing preference
            if (TaskEditNotification !== undefined) notificationPreference.TaskEditNotification = TaskEditNotification;
            if (TaskStatusChangeNotification !== undefined) notificationPreference.TaskStatusChangeNotification = TaskStatusChangeNotification;
            if (TaskAssignNotification !== undefined) notificationPreference.TaskAssignNotification = TaskAssignNotification;
            if (TaskDismissNotification !== undefined) notificationPreference.TaskDismissNotification = TaskDismissNotification;
            if (TaskDeleteNotification !== undefined) notificationPreference.TaskDeleteNotification = TaskDeleteNotification;
            if (NewSupervisorNotification !== undefined) notificationPreference.NewSupervisorNotification = NewSupervisorNotification;
            if (RemovedSupervisorNotification !== undefined) notificationPreference.RemovedSupervisorNotification = RemovedSupervisorNotification;

            await notificationPreference.save();
            return res.status(200).json({ message: 'Notification Preference Updated Successfully', notificationPreference });
        }
    } catch (err) {
        console.log("Error: " + err);
        return res.status(500).json({ message: 'Error Creating or Updating Notification Preference', err });
    }
});


app.listen(5000);
